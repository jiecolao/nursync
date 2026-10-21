import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AuditLogsService } from '../audit_logs/audit_logs.service';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sanitize from 'sanitize-filename';

const CATEGORY_MAP: Record<string, string> = {
  academic: 'Academic Records',
  personal: 'Personal Records',
  'completion & certificate': 'Completion and Certification Records',
  'completion and certificate': 'Completion and Certification Records',
  others: 'Others',
  clinical: 'Clinical Records',
};
const ROOT = path.resolve(process.env.STUDENT_DOCUMENTS_ROOT || './Database/Students');
const norm = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
const categoryFor = (value: string) => CATEGORY_MAP[norm(value)];

type UploadFile = Express.Multer.File & { importPath?: string };

@Injectable()
export class StudentBulkImportService {
  private readonly logger = new Logger(StudentBulkImportService.name);
  constructor(private readonly prisma: PrismaService, private readonly auditLogs: AuditLogsService) {}

  async preview(paths: string[]) {
    if (!Array.isArray(paths) || !paths.length) throw new BadRequestException('Select a folder containing student folders and documents.');
    const students = await this.prisma.student.findMany({ select: { studentUuid: true, lastName: true, firstName: true, middleName: true } });
    const items = paths.map((raw) => {
      const parts = raw.replace(/\\/g, '/').split('/').filter(Boolean);
      if (parts.length !== 3 || parts.some((part) => part === '.' || part === '..')) {
        return { path: raw, valid: false, reason: 'Expected Student Folder / Category / File.' };
      }
      const [studentFolder, categoryFolder, ...rest] = parts;
      const filename = rest[rest.length - 1];
      const category = categoryFor(categoryFolder);
      const nameParts = studentFolder.split(',').map((part) => part.trim());
      if (nameParts.length < 2 || nameParts.length > 3 || nameParts.some((part) => !part)) return { path: raw, valid: false, reason: 'Student folder must be LAST NAME, First Name, Middle Name.' };
      if (!category) return { path: raw, valid: false, reason: `Unknown category folder "${categoryFolder}". Use Academic, Personal, Completion & Certificate, Others, or Clinical.` };
      const [lastName, firstName, middleName] = nameParts;
      const matches = students.filter((s) => norm(s.lastName) === norm(lastName) && norm(s.firstName) === norm(firstName)
        && norm(s.middleName || '') === norm(middleName || ''));
      if (matches.length !== 1) return { path: raw, valid: false, reason: matches.length ? 'Student name is ambiguous; include the exact middle name.' : 'No matching student found in the student database.' };
      return { path: raw, studentFolder, categoryFolder, valid: true, studentUuid: matches[0].studentUuid, studentName: [matches[0].lastName, matches[0].firstName, matches[0].middleName].filter(Boolean).join(', '), category, filename };
    });
    return { total: items.length, valid: items.filter((i) => i.valid).length, invalid: items.filter((i) => !i.valid).length, items };
  }

  async importFiles(files: UploadFile[], rawPaths: string, actorUserId: string) {
    let paths: string[];
    try { paths = JSON.parse(rawPaths); } catch { throw new BadRequestException('Import paths are invalid.'); }
    if (!Array.isArray(paths) || paths.length !== files.length) throw new BadRequestException('Every selected file must have a relative folder path.');
    const preview = await this.preview(paths);
    const invalid = preview.items.filter((item) => !item.valid);
    if (invalid.length) throw new BadRequestException({ message: 'Import contains invalid files. Correct the folder names and preview again.', invalid });
    const resolved = preview.items as Array<{ path: string; studentFolder: string; categoryFolder: string; valid: true; studentUuid: string; studentName: string; category: string; filename: string }>;
    const status = await this.prisma.documentStatus.findFirst({ where: { docuStatusId: 1 } }) ?? await this.prisma.documentStatus.findFirst();
    if (!status) throw new BadRequestException('No document statuses are configured.');
    const categoryRecords = await this.prisma.documentCategories.findMany();
    const staged: Array<{ destination: string; stage: string; relative: string; item: typeof resolved[number]; name: string; backup?: string; installed?: boolean }> = [];
    const stageRoot = path.join(ROOT, `.bulk-import-${randomUUID()}`);
    await fs.mkdir(stageRoot, { recursive: true });
    try {
      for (let i = 0; i < files.length; i++) {
        const item = resolved[i];
        const categoryRecord = categoryRecords.find((c) => c.docuName === item.category);
        if (!categoryRecord) throw new BadRequestException(`Document category "${item.category}" is not configured in the database.`);
        const directory = path.resolve(ROOT, item.studentFolder, item.categoryFolder);
        if (!directory.startsWith(ROOT + path.sep)) throw new BadRequestException('Invalid import destination.');
        await fs.mkdir(directory, { recursive: true });
        const name = sanitize(path.basename(item.filename));
        if (!name) throw new BadRequestException('Invalid filename.');
        const destination = path.join(directory, name);
        const stage = path.join(stageRoot, String(i));
        await fs.writeFile(stage, files[i].buffer, { flag: 'wx' });
        staged.push({ destination, stage, relative: path.relative(process.cwd(), destination).split(path.sep).join('/'), item, name });
      }
      const saved = await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        const records = [];
        for (const file of staged) {
          const category = categoryRecords.find((c) => c.docuName === file.item.category)!;
          try { await fs.access(file.destination); file.backup = path.join(stageRoot, `backup-${staged.indexOf(file)}`); await fs.rename(file.destination, file.backup); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          await fs.rename(file.stage, file.destination);
          file.installed = true;
          const existing = await tx.studentDocument.findFirst({ where: { studentUuid: file.item.studentUuid, filepath: file.relative } });
          const record = existing
            ? await tx.studentDocument.update({ where: { studentDocId: existing.studentDocId }, data: { filename: file.name, filepath: file.relative, submittedAt: new Date(), docuId: category.docuId, docuStatusId: status.docuStatusId } })
            : await tx.studentDocument.create({ data: { studentDocId: randomUUID(), studentUuid: file.item.studentUuid, docuId: category.docuId, filename: file.name, filepath: file.relative, submittedAt: new Date(), docuStatusId: status.docuStatusId } });
          await this.auditLogs.createFileModificationLogInTransaction(tx, {
            userAccId: actor.userAccId, roleId: actor.roleId, studentName: file.item.studentName,
            fileAction: existing ? 'bulk_import_overwrite' : 'bulk_import', fileModified: '', fileLoc: file.relative,
          }, actor.adminName, existing ?? null, record);
          records.push(record);
        }
        await this.auditLogs.createActivityLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.bulk_import',
        }, actor.adminName, JSON.stringify({ count: records.length, files: staged.map((f) => f.relative) }));
        return records;
      });
      return { count: saved.length, documents: saved };
    } catch (error) {
      for (const file of [...staged].reverse()) {
        try { if (file.installed) await fs.rm(file.destination, { force: true }); if (file.backup) await fs.rename(file.backup, file.destination); } catch (rollbackError) { this.logger.error(`Bulk import rollback failed for ${file.destination}: ${String(rollbackError)}`); }
        try { await fs.rm(file.stage, { force: true }); } catch {}
      }
      throw error;
    } finally {
      await fs.rm(stageRoot, { recursive: true, force: true }).catch((error) => this.logger.warn(String(error)));
    }
  }
}
