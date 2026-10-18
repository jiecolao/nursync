import {
  BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sanitize from 'sanitize-filename';
import { AuditLogsService } from '../audit_logs/audit_logs.service';

const CATEGORIES = [
  'Personal Records',
  'Academic Records',
  'Clinical Records', 
  'Completion and Certification Records', 
  'Others', 
] as const;
const DEFAULT_STATUS_ID = 1;

@Injectable()
export class StudentDocumentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StudentDocumentsService.name);
  private watcher?: FSWatcher;
  private readonly root = path.resolve(process.env.STUDENT_DOCUMENTS_ROOT || './Database/Students');
  private readonly debounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly prisma: PrismaService, private readonly auditLogs: AuditLogsService) {}

  onModuleInit() { void this.startWatcher(); }
  async onModuleDestroy() {
    await this.watcher?.close();
    for (const timer of this.debounce.values()) clearTimeout(timer);
  }

  async list(uuid: string) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found.');
    const documents = await this.prisma.studentDocument.findMany({
      where: { studentUuid: uuid, documentStatus: { 
        docuStatusName: {
          not: 'Trashed',
        }
      }},
      include: { documentCategories: true, documentStatus: true },
      orderBy: [{ docuId: 'asc' }, { filename: 'asc' }],
    });
    const categories = CATEGORIES.map((name) => {
      const category = documents.filter((doc) => doc.documentCategories.docuName === name);
      return { name, count: category.length, documents: category };
    });
    return { studentUuid: uuid, categories, total: documents.length };
  }

  async upload(uuid: string, files: Express.Multer.File[], requestedCategory: string) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found.');
    const category = CATEGORIES.includes(requestedCategory as typeof CATEGORIES[number]) ? requestedCategory : '';
    this.logger.log(`Received requestedCategory: "${requestedCategory}"`);
    if (!category) throw new BadRequestException('A valid document category is required.');
    const categoryRecord = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
    if (!categoryRecord) throw new BadRequestException(`Document category "${category}" is not configured in the database.`);
    const status = await this.prisma.documentStatus.findFirst({ where: { docuStatusId: DEFAULT_STATUS_ID } })
      ?? await this.prisma.documentStatus.findFirst();
    if (!status) throw new BadRequestException('No document statuses are configured.');
    const folderName = `${student.lastName}, ${student.firstName}`;
    const directory = path.resolve(this.root, folderName, category);
    await fs.mkdir(directory, { recursive: true });
    const saved = [];
    for (const file of files) {
      const safeName = sanitize(path.basename(file.originalname));
      const destination = path.join(directory, safeName);
      await fs.writeFile(destination, file.buffer, { flag: 'w' });
      const relativePath = path.relative(process.cwd(), destination).split(path.sep).join('/');
      const existing = await this.prisma.studentDocument.findFirst({ where: { studentUuid: uuid, filepath: relativePath } });
      const record = existing
        ? await this.prisma.studentDocument.update({
            where: { studentDocId: existing.studentDocId },
            data: { filename: safeName, filepath: relativePath, submittedAt: new Date(), docuId: categoryRecord.docuId, docuStatusId: status.docuStatusId },
          })
        : await this.prisma.studentDocument.create({
            data: { studentDocId: randomUUID(), studentUuid: uuid, docuId: categoryRecord.docuId, filename: safeName, filepath: relativePath, submittedAt: new Date(), docuStatusId: status.docuStatusId },
          });
      saved.push(record);
    }
    return { count: saved.length, documents: saved };
  }

  async remove(uuid: string, studentDocId: string, actorUserId: string) {
    const record = await this.prisma.studentDocument.findFirst({
      where: { studentUuid: uuid, studentDocId },
    });
    if (!record) throw new NotFoundException('Document not found.');

    const trashedStatus = await this.prisma.documentStatus.findFirst({
      where: { docuStatusName: 'Trashed' },
    });
    if (!trashedStatus) {
      throw new BadRequestException('The "Trashed" document status is not configured.');
    }

    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    let trashedPath = record.filepath;
    let movedFile: { source: string; destination: string } | undefined;

    if (record.filepath) {
      const source = path.resolve(process.cwd(), record.filepath);
      const safeRoot = path.resolve(this.root);
      if (source !== safeRoot && !source.startsWith(safeRoot + path.sep)) {
        throw new BadRequestException('Document path is outside the student documents directory.');
      }
      try {
        await fs.access(source);
        await fs.mkdir(trashRoot, { recursive: true });
        const filename = path.basename(source);
        let destination = path.join(trashRoot, filename);
        // Avoid overwriting a different file that was previously trashed.
        try {
          await fs.access(destination);
          destination = path.join(trashRoot, `${path.parse(filename).name}-${record.studentDocId}${path.parse(filename).ext}`);
        } catch {
          // Destination is available.
        }
        await fs.rename(source, destination);
        movedFile = { source, destination };
        trashedPath = path.relative(process.cwd(), destination).split(path.sep).join('/');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        // Preserve metadata even if the source file has already gone missing.
        trashedPath = record.filepath;
      }
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        const result = await tx.studentDocument.update({
          where: { studentDocId: record.studentDocId },
          data: { docuStatusId: trashedStatus.docuStatusId, filepath: trashedPath },
        });
        await this.auditLogs.createFileModificationLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId, studentName: record.studentUuid,
          fileAction: 'trash', fileModified: '', fileLoc: trashedPath || record.filepath || '',
        }, actor.adminName, record, result);
        await this.auditLogs.createActivityLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.trash',
        }, actor.adminName, JSON.stringify({ studentDocId }));
        return result;
      });
      return { trashed: true, document: updated };
    } catch (error) {
      // Keep filesystem and database consistent if the metadata update fails.
      if (movedFile) {
        try { await fs.rename(movedFile.destination, movedFile.source); }
        catch (rollbackError) { this.logger.error(`Failed to restore trashed file ${movedFile.destination}: ${String(rollbackError)}`); }
      }
      throw error;
    }
  }

  async listTrash() {
    const trashedStatus = await this.prisma.documentStatus.findFirst({ where: { docuStatusName: 'Trashed' } });
    if (!trashedStatus) throw new BadRequestException('The "Trashed" document status is not configured.');
    return this.prisma.studentDocument.findMany({
      where: { docuStatusId: trashedStatus.docuStatusId },
      include: { student: true, documentCategories: true, documentStatus: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async restoreFromTrash(studentDocId: string) {
    const record = await this.prisma.studentDocument.findUnique({
      where: { studentDocId },
      include: { student: true, documentCategories: true, documentStatus: true },
    });
    if (!record || record.documentStatus.docuStatusName !== 'Trashed') throw new NotFoundException('Trashed document not found.');
    if (!record.filename) throw new BadRequestException('Cannot restore a document without a filename.');
    const source = path.resolve(process.cwd(), record.filepath || '');
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    if (!record.filepath || !source.startsWith(trashRoot + path.sep)) throw new BadRequestException('Document path is outside the trash directory.');
    const studentFolder = `${record.student.lastName}, ${record.student.firstName}`;
    const destination = path.resolve(this.root, studentFolder, record.documentCategories.docuName, record.filename);
    const safeStudentRoot = path.resolve(this.root);
    if (!destination.startsWith(safeStudentRoot + path.sep)) throw new BadRequestException('Invalid restore destination.');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try { await fs.access(destination); throw new BadRequestException('A file with this name already exists in the original folder. Rename or move that file before restoring.'); }
    catch (error) { if (error instanceof BadRequestException) throw error; if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await fs.rename(source, destination);
    try {
      const updated = await this.prisma.studentDocument.update({
        where: { studentDocId },
        data: {
          filepath: path.relative(process.cwd(), destination).split(path.sep).join('/'),
          docuStatusId: (await this.prisma.documentStatus.findFirst({ where: { docuStatusName: { not: 'Trashed' } }, orderBy: { docuStatusId: 'asc' } }))?.docuStatusId ?? DEFAULT_STATUS_ID,
        },
      });
      return { restored: true, document: updated };
    } catch (error) {
      try { await fs.rename(destination, source); } catch (rollbackError) { this.logger.error(`Failed to move restored file back to trash: ${String(rollbackError)}`); }
      throw error;
    }
  }

  async permanentlyDelete(studentDocId: string) {
    const record = await this.prisma.studentDocument.findUnique({
      where: { studentDocId }, include: { documentStatus: true },
    });
    if (!record || record.documentStatus.docuStatusName !== 'Trashed') throw new NotFoundException('Trashed document not found.');
    if (record.filepath) {
      const absolute = path.resolve(process.cwd(), record.filepath);
      const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
      if (!absolute.startsWith(trashRoot + path.sep)) throw new BadRequestException('Document path is outside the trash directory.');
      await fs.rm(absolute, { force: true });
    }
    await this.prisma.studentDocument.delete({ where: { studentDocId } });
    return { deleted: true };
  }

  async emptyTrash() {
    const trashedStatus = await this.prisma.documentStatus.findFirst({ where: { docuStatusName: 'Trashed' } });
    if (!trashedStatus) throw new BadRequestException('The "Trashed" document status is not configured.');
    const records = await this.prisma.studentDocument.findMany({ where: { docuStatusId: trashedStatus.docuStatusId } });
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    for (const record of records) {
      if (!record.filepath) continue;
      const absolute = path.resolve(process.cwd(), record.filepath);
      if (!absolute.startsWith(trashRoot + path.sep)) throw new BadRequestException(`Unsafe trash path for document ${record.studentDocId}.`);
      await fs.rm(absolute, { force: true });
    }
    await this.prisma.studentDocument.deleteMany({ where: { docuStatusId: trashedStatus.docuStatusId } });
    return { deletedCount: records.length };
  }

  async resolveFile(filepath: string) {
    const absolute = path.resolve(process.cwd(), filepath);
    const safeRoot = path.resolve(this.root);
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    const insideStudentRoot = absolute.startsWith(safeRoot + path.sep);
    const insideTrashRoot = absolute.startsWith(trashRoot + path.sep);
    if (!insideStudentRoot && !insideTrashRoot) throw new BadRequestException('Invalid document path.');
    try { await fs.access(absolute); } catch { throw new NotFoundException('File not found.'); }
    return absolute;
  }

  private async startWatcher() {
    await fs.mkdir(this.root, { recursive: true });
    this.watcher = chokidar.watch(this.root, {
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      atomic: true,
      followSymlinks: false,
    });
    this.watcher.on('add', (file) => this.scheduleSync(file));
    this.watcher.on('unlink', (file) => { void this.removeByPath(file); });
    this.watcher.on('change', (file) => this.scheduleSync(file));
    this.watcher.on('error', (error) => this.logger.error(String(error)));
    this.watcher.on('ready', () => this.logger.log(`Watching student documents at ${this.root}`));
  }

  private scheduleSync(file: string) {
    const prior = this.debounce.get(file);
    if (prior) clearTimeout(prior);
    this.debounce.set(file, setTimeout(() => {
      this.debounce.delete(file);
      void this.syncFile(file);
    }, 350));
  }

  private async syncFile(file: string) {
    try {
      const relative = path.relative(this.root, file);
      const parts = relative.split(path.sep);
      if (parts.length !== 3 || !CATEGORIES.includes(parts[1] as typeof CATEGORIES[number])) return;
      const [folder, category, filename] = parts;
      const [lastName, ...firstParts] = folder.split(', ');
      if (!lastName || !firstParts.length) return;
      const student = await this.prisma.student.findFirst({
        where: { lastName, firstName: firstParts.join(', ') },
      });
      const categoryRecord = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
      const status = await this.prisma.documentStatus.findFirst({ where: { docuStatusId: DEFAULT_STATUS_ID } })
        ?? await this.prisma.documentStatus.findFirst();
      if (!student || !categoryRecord || !status) return;
      const filepath = path.relative(process.cwd(), file).split(path.sep).join('/');
      const existing = await this.prisma.studentDocument.findFirst({ where: { studentUuid: student.studentUuid, filepath } });
      if (existing) {
        await this.prisma.studentDocument.update({
          where: { studentDocId: existing.studentDocId },
          data: { filename, submittedAt: new Date(), docuId: categoryRecord.docuId },
        });
      } else {
        await this.prisma.studentDocument.create({
          data: { studentDocId: randomUUID(), studentUuid: student.studentUuid, docuId: categoryRecord.docuId, filename, filepath, submittedAt: new Date(), docuStatusId: status.docuStatusId },
        });
      }
    } catch (error) {
      this.logger.error(`Could not sync ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async removeByPath(file: string) {
    // Do not delete metadata on unlink events: the soft-delete flow moves the
    // file out of the watched tree before updating its row to the Trashed status.
    // Deleting here would race with that update and destroy the retained record.
    this.logger.debug(`File removed from watched directory: ${file}; metadata is retained for soft deletion.`);
  }
}
