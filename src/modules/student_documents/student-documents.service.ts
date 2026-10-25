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
const IMPORT_CATEGORY_MAP: Record<string, string> = {
  academic: 'Academic Records',
  'academic records': 'Academic Records',
  personal: 'Personal Records',
  'personal records': 'Personal Records',
  'completion records': 'Completion and Certification Records',
  'completion and certification records': 'Completion and Certification Records',
  'completion & certification records': 'Completion and Certification Records',
  'completion and certification': 'Completion and Certification Records',
  'completion & certificate': 'Completion and Certification Records',
  'rle/clinical records': 'Clinical Records',
  'rle clinical records': 'Clinical Records',
  clinical: 'Clinical Records',
  'clinical records': 'Clinical Records',
  others: 'Others',
  ...Object.fromEntries(CATEGORIES.map((name) => [name.toLocaleLowerCase(), name])),
};
const normalizeName = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

function capitalizeLastName(lastName: string) {
  const trimmed = lastName.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() : trimmed;
}

@Injectable()
export class StudentDocumentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StudentDocumentsService.name);
  private watcher?: FSWatcher;
  private readonly root = path.resolve(process.env.STUDENT_DOCUMENTS_ROOT || './Database/Students');
  private readonly debounce = new Map<string, ReturnType<typeof setTimeout>>();
  private purgeTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService, private readonly auditLogs: AuditLogsService) {}

  onModuleInit() {
    void this.startWatcher();
    void this.purgeExpiredTrash();
    this.purgeTimer = setInterval(() => { void this.purgeExpiredTrash(); }, 60 * 60 * 1000);
  }
  async onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
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
    // The database is the metadata source; also discover PDFs that exist on disk
    // but have not yet been indexed in Student_Documents.
    const normalize = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const aliases = (value: string) => normalize(value).replace(/[^\p{L}\p{N}]+/gu, '');
    const studentFolderCandidates = [
      `${student.lastName}, ${student.firstName} ${student.middleName ?? ''}`,
      `${student.lastName}, ${student.firstName}`,
    ].map(normalize);
    const directoryDocuments: Array<Record<string, unknown>> = [];
    try {
      const roots = await fs.readdir(this.root, { withFileTypes: true });
      for (const batch of roots.filter((entry) => entry.isDirectory() && (/^batch\s+\d{4}$/i.test(entry.name) || /^non-graduate$/i.test(entry.name)))) {
        let studentDirs: import('node:fs').Dirent[];
        try { studentDirs = await fs.readdir(path.join(this.root, batch.name), { withFileTypes: true }); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
          throw error;
        }
        const matching = studentDirs.filter((entry) => entry.isDirectory() && studentFolderCandidates.some((candidate) => aliases(candidate) === aliases(entry.name)));
        for (const studentDir of matching) {
          const studentPath = path.join(this.root, batch.name, studentDir.name);
          let categoryDirs: import('node:fs').Dirent[];
          try { categoryDirs = await fs.readdir(studentPath, { withFileTypes: true }); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
            throw error;
          }
          for (const categoryDir of categoryDirs.filter((entry) => entry.isDirectory())) {
            const category = CATEGORIES.find((name) => aliases(name) === aliases(categoryDir.name));
            if (!category) continue;
            let files: import('node:fs').Dirent[];
            try { files = await fs.readdir(path.join(studentPath, categoryDir.name), { withFileTypes: true }); }
            catch (error) {
              if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
              throw error;
            }
            for (const file of files.filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))) {
              const filepath = path.relative(process.cwd(), path.join(studentPath, categoryDir.name, file.name)).split(path.sep).join('/');
              if (documents.some((doc) => doc.filepath && normalize(doc.filepath) === normalize(filepath))) continue;
              directoryDocuments.push({
                studentDocId: `disk:${filepath}`, studentUuid: uuid,
                docuId: CATEGORIES.indexOf(category) + 1, filename: file.name, filepath,
                submittedAt: null, documentStatus: { docuStatusName: 'Available' },
                documentCategories: { docuName: category }, source: 'filesystem',
              });
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Could not scan student document folders: ${String(error)}`);
      }
    }
    const categories = CATEGORIES.map((name) => {
      const databaseDocuments = documents.filter((doc) => doc.documentCategories.docuName === name);
      const diskDocuments = directoryDocuments.filter((doc) => (doc.documentCategories as { docuName: string }).docuName === name);
      const merged = [...databaseDocuments, ...diskDocuments];
      return { name, count: merged.length, documents: merged };
    });
    return { studentUuid: uuid, categories, total: documents.length + directoryDocuments.length };
  }

  async upload(uuid: string, files: Express.Multer.File[], requestedCategory: string, actorUserId: string) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found.');
    const category = CATEGORIES.includes(requestedCategory as typeof CATEGORIES[number]) ? requestedCategory : '';
    if (!category) throw new BadRequestException('A valid document category is required.');
    const categoryRecord = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
    if (!categoryRecord) throw new BadRequestException(`Document category "${category}" is not configured in the database.`);
    const status = await this.prisma.documentStatus.findFirst({ where: { docuStatusId: DEFAULT_STATUS_ID } }) ?? await this.prisma.documentStatus.findFirst();
    if (!status) throw new BadRequestException('No document statuses are configured.');
    const directory = path.resolve(this.root, `${capitalizeLastName(student.lastName)}, ${student.firstName}`, category);
    await fs.mkdir(directory, { recursive: true });
    const stageDir = path.join(directory, `.upload-${randomUUID()}`);
    await fs.mkdir(stageDir, { recursive: false });
    const staged: Array<{ stage: string; destination: string; backup?: string; installed?: boolean; relativePath: string; name: string }> = [];
    try {
      for (const file of files) {
        const name = sanitize(path.basename(file.originalname));
        if (!name) throw new BadRequestException('Invalid filename.');
        const destination = path.join(directory, name);
        const stage = path.join(stageDir, name);
        await fs.rename(file.path, stage);
        staged.push({ stage, destination, relativePath: path.relative(process.cwd(), destination).split(path.sep).join('/'), name });
      }
      const saved = await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        const results = [];
        for (const item of staged) {
          try {
            await fs.access(item.destination);
            item.backup = path.join(stageDir, `backup-${staged.indexOf(item)}`);
            await fs.rename(item.destination, item.backup);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          await fs.rename(item.stage, item.destination);
          item.installed = true;
          const existing = await tx.studentDocument.findFirst({ where: { studentUuid: uuid, filepath: item.relativePath } });
          const record = existing
            ? await tx.studentDocument.update({ where: { studentDocId: existing.studentDocId }, data: { filename: item.name, filepath: item.relativePath, submittedAt: new Date(), docuId: categoryRecord.docuId, docuStatusId: status.docuStatusId } })
            : await tx.studentDocument.create({ data: { studentDocId: randomUUID(), studentUuid: uuid, docuId: categoryRecord.docuId, filename: item.name, filepath: item.relativePath, submittedAt: new Date(), docuStatusId: status.docuStatusId } });
          await this.auditLogs.createFileModificationLogInTransaction(tx, {
            userAccId: actor.userAccId, roleId: actor.roleId, studentName: capitalizeLastName(student.lastName) + ', ' + student.firstName,
            fileAction: existing ? 'upload_overwrite' : 'upload', fileModified: '', fileLoc: item.relativePath,
          }, actor.adminName, existing ?? null, record);
          results.push(record);
        }
        await this.auditLogs.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.upload' }, actor.adminName, JSON.stringify({ studentUuid: uuid, count: results.length, files: staged.map((item) => item.name) }));
        return results;
      });
      await fs.rm(stageDir, { recursive: true, force: true });
      return { count: saved.length, documents: saved };
    } catch (error) {
      for (const item of [...staged].reverse()) {
        try {
          if (item.installed) await fs.rm(item.destination, { force: true });
          if (item.backup) await fs.rename(item.backup, item.destination);
        } catch (cleanupError) {
          this.logger.error(`Upload compensation failed for ${item.destination}: ${String(cleanupError)}`);
        }
      }
      try { await fs.rm(stageDir, { recursive: true, force: true }); }
      catch (cleanupError) { this.logger.error(`Could not clean upload staging directory: ${String(cleanupError)}`); }
      throw error;
    } finally {
      for (const file of files) {
        try {
          await fs.rm(file.path, { force: true });
        } catch (cleanupError) {
          this.logger.error(`Could not clean temporary upload ${file.path}: ${String(cleanupError)}`);
        }
      }
    }
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

  private async purgeExpiredTrash() {
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trashedStatus = await this.prisma.documentStatus.findFirst({ where: { docuStatusName: 'Trashed' } });
    if (!trashedStatus) return;

    const expired = await this.prisma.studentDocument.findMany({
      where: { docuStatusId: trashedStatus.docuStatusId, updatedAt: { lte: retentionCutoff } },
    });
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');

    for (const record of expired) {
      try {
        if (record.filepath) {
          const absolute = path.resolve(process.cwd(), record.filepath);
          if (!absolute.startsWith(trashRoot + path.sep)) {
            this.logger.warn(`Skipping expired trash record with unsafe path: ${record.studentDocId}`);
            continue;
          }
          await fs.rm(absolute, { force: true });
        }
        await this.prisma.studentDocument.delete({ where: { studentDocId: record.studentDocId } });
        this.logger.log(`Permanently deleted expired trash document ${record.studentDocId}`);
      } catch (error) {
        this.logger.error(`Could not purge expired trash document ${record.studentDocId}: ${String(error)}`);
      }
    }
  }

  async listTrash() {
    await this.purgeExpiredTrash();
    const trashedStatus = await this.prisma.documentStatus.findFirst({ where: { docuStatusName: 'Trashed' } });
    if (!trashedStatus) throw new BadRequestException('The "Trashed" document status is not configured.');
    return this.prisma.studentDocument.findMany({
      where: { docuStatusId: trashedStatus.docuStatusId },
      include: { student: true, documentCategories: true, documentStatus: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async restoreFromTrash(studentDocId: string, actorUserId: string) {
    const record = await this.prisma.studentDocument.findUnique({
      where: { studentDocId },
      include: { student: true, documentCategories: true, documentStatus: true },
    });
    if (!record || record.documentStatus.docuStatusName !== 'Trashed') throw new NotFoundException('Trashed document not found.');
    if (!record.filename) throw new BadRequestException('Cannot restore a document without a filename.');
    const source = path.resolve(process.cwd(), record.filepath || '');
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    if (!record.filepath || !source.startsWith(trashRoot + path.sep)) throw new BadRequestException('Document path is outside the trash directory.');
    const studentFolder = `${capitalizeLastName(record.student.lastName)}, ${record.student.firstName}`;
    const destination = path.resolve(this.root, studentFolder, record.documentCategories.docuName, record.filename);
    const safeStudentRoot = path.resolve(this.root);
    if (!destination.startsWith(safeStudentRoot + path.sep)) throw new BadRequestException('Invalid restore destination.');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try { await fs.access(destination); throw new BadRequestException('A file with this name already exists in the original folder. Rename or move that file before restoring.'); }
    catch (error) { if (error instanceof BadRequestException) throw error; if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await fs.rename(source, destination);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        const result = await tx.studentDocument.update({
          where: { studentDocId },
          data: {
            filepath: path.relative(process.cwd(), destination).split(path.sep).join('/'),
            docuStatusId: (await tx.documentStatus.findFirst({ where: { docuStatusName: { not: 'Trashed' } }, orderBy: { docuStatusId: 'asc' } }))?.docuStatusId ?? DEFAULT_STATUS_ID,
          },
        });
        await this.auditLogs.createFileModificationLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId,
          studentName: capitalizeLastName(record.student.lastName) + ', ' + record.student.firstName,
          fileAction: 'restore', fileModified: '', fileLoc: result.filepath || '',
        }, actor.adminName, record, result);
        await this.auditLogs.createActivityLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.restore',
        }, actor.adminName, JSON.stringify({ studentDocId }));
        return result;
      });
      return { restored: true, document: updated };
    } catch (error) {
      try { await fs.rename(destination, source); } catch (rollbackError) { this.logger.error(`Failed to move restored file back to trash: ${String(rollbackError)}`); }
      throw error;
    }
  }

  async permanentlyDelete(studentDocId: string, actorUserId: string) {
    const record = await this.prisma.studentDocument.findUnique({ where: { studentDocId }, include: { documentStatus: true, student: true } });
    if (!record || record.documentStatus.docuStatusName !== 'Trashed') throw new NotFoundException('Trashed document not found.');
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    let stagedPath: string | undefined;
    let absolute: string | undefined;
    if (record.filepath) {
      absolute = path.resolve(process.cwd(), record.filepath);
      if (!absolute.startsWith(trashRoot + path.sep)) throw new BadRequestException('Document path is outside the trash directory.');
      try {
        await fs.access(absolute);
        stagedPath = path.join(path.dirname(absolute), `.deleting-${randomUUID()}`);
        await fs.rename(absolute, stagedPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        await tx.studentDocument.delete({ where: { studentDocId } });
        await this.auditLogs.createFileModificationLogInTransaction(tx, {
          userAccId: actor.userAccId, roleId: actor.roleId,
          studentName: capitalizeLastName(record.student.lastName) + ', ' + record.student.firstName,
          fileAction: 'permanent_delete', fileModified: '', fileLoc: record.filepath || '',
        }, actor.adminName, record, null);
        await this.auditLogs.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.permanent_delete' }, actor.adminName, JSON.stringify({ studentDocId }));
      });
    } catch (error) {
      if (stagedPath && absolute) {
        try { await fs.rename(stagedPath, absolute); }
        catch (rollbackError) { this.logger.error(`Could not restore deleted file ${absolute}: ${String(rollbackError)}`); }
      }
      throw error;
    }
    if (stagedPath) await fs.rm(stagedPath, { force: true });
    return { deleted: true };
  }

  async emptyTrash(actorUserId: string) {
    const trashedStatus = await this.prisma.documentStatus.findFirst({ where: { docuStatusName: 'Trashed' } });
    if (!trashedStatus) throw new BadRequestException('The "Trashed" document status is not configured.');
    const records = await this.prisma.studentDocument.findMany({ where: { docuStatusId: trashedStatus.docuStatusId }, include: { student: true } });
    const trashRoot = path.resolve(process.cwd(), 'Database/Trash');
    const staged: Array<{ original: string; temporary: string; record: typeof records[number] }> = [];
    try {
      for (const record of records) {
        if (!record.filepath) continue;
        const original = path.resolve(process.cwd(), record.filepath);
        if (!original.startsWith(trashRoot + path.sep)) throw new BadRequestException(`Unsafe trash path for document ${record.filename}.`);
        try {
          await fs.access(original);
          const temporary = path.join(path.dirname(original), `.deleting-${randomUUID()}`);
          await fs.rename(original, temporary);
          staged.push({ original, temporary, record });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      await this.prisma.$transaction(async (tx) => {
        const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
        await tx.studentDocument.deleteMany({ where: { docuStatusId: trashedStatus.docuStatusId } });
        for (const record of records) {
          await this.auditLogs.createFileModificationLogInTransaction(tx, {
            userAccId: actor.userAccId, roleId: actor.roleId,
            studentName: capitalizeLastName(record.student.lastName) + ', ' + record.student.firstName,
            fileAction: 'empty_trash_delete', fileModified: '', fileLoc: record.filepath || '',
          }, actor.adminName, record, null);
        }
        await this.auditLogs.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'document.empty_trash' }, actor.adminName, JSON.stringify({ deletedCount: records.length }));
      });
    } catch (error) {
      for (const item of staged.reverse()) {
        try { await fs.rename(item.temporary, item.original); }
        catch (rollbackError) { this.logger.error(`Could not restore trashed file ${item.original}: ${String(rollbackError)}`); }
      }
      throw error;
    }
    for (const item of staged) await fs.rm(item.temporary, { force: true });
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
      const parts = relative.split(path.sep).filter(Boolean);
      // Supported layouts:
      // BATCH 2021/Last, First Middle/Category/file.pdf
      // NON-GRADUATE/Last, First Middle/Category/file.pdf
      // Legacy: Last, First Middle/Category/file.pdf
      const hasBatchFolder = parts.length === 4
        && (/^batch\s+\d{4}$/i.test(parts[0]) || /^non-graduate$/i.test(parts[0]));
      if (parts.length !== (hasBatchFolder ? 4 : 3)) return;
      const [folder, categoryFolder, filename] = hasBatchFolder
        ? [parts[1], parts[2], parts[3]]
        : [parts[0], parts[1], parts[2]];
      if (!/\.pdf$/i.test(filename) || filename.startsWith('.upload-') || filename.startsWith('.bulk-import-')) return;

      const categoryKey = normalizeName(categoryFolder);
      const category = IMPORT_CATEGORY_MAP[categoryKey]
        ?? CATEGORIES.find((name) => normalizeName(name) === categoryKey);
      if (!category) return;

      const normalizeComparable = (value: string) =>
        value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      const nameParts = folder.split(',').map((part) => part.trim());
      if (nameParts.length !== 2 || nameParts.some((part) => !part)) return;
      const [lastName, givenNames] = nameParts;
      const candidates = await this.prisma.student.findMany({
        select: { studentUuid: true, lastName: true, firstName: true, middleName: true },
      });
      const matches = candidates.filter((student) => {
        if (normalizeComparable(student.lastName) !== normalizeComparable(lastName)) return false;
        const first = normalizeComparable(student.firstName);
        const middle = normalizeComparable(student.middleName ?? '');
        const supplied = normalizeComparable(givenNames);
        const full = first + middle;
        // Accommodate folder names with or without the middle name and common middle initials.
        const middleInitial = middle.charAt(0);
        return supplied === first || supplied === full || (!!middleInitial && supplied === first + middleInitial);
      });
      if (matches.length !== 1) {
        this.logger.warn(`Skipping watched file with ${matches.length ? 'ambiguous' : 'unmatched'} student folder "${folder}": ${file}`);
        return;
      }

      const student = matches[0];
      const categoryRecord = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
      const status = await this.prisma.documentStatus.findFirst({ where: { docuStatusId: DEFAULT_STATUS_ID } })
        ?? await this.prisma.documentStatus.findFirst();
      if (!categoryRecord || !status) {
        this.logger.warn(`Skipping watched file because category or document status is missing: ${file}`);
        return;
      }

      const filepath = path.relative(process.cwd(), file).split(path.sep).join('/');
      const existing = await this.prisma.studentDocument.findFirst({
        where: { studentUuid: student.studentUuid, filepath },
      });
      if (existing) {
        await this.prisma.studentDocument.update({
          where: { studentDocId: existing.studentDocId },
          data: { filename, submittedAt: new Date(), docuId: categoryRecord.docuId },
        });
      } else {
        await this.prisma.studentDocument.create({
          data: {
            studentDocId: randomUUID(),
            studentUuid: student.studentUuid,
            docuId: categoryRecord.docuId,
            filename,
            filepath,
            submittedAt: new Date(),
            docuStatusId: status.docuStatusId,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Could not sync ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async removeByPath(file: string) {
    // File moves used by the trash flow emit unlink events before their database
    // transaction updates filepath. Wait briefly, then only remove a row that
    // still points at this missing file. This keeps soft-deleted records intact.
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      await fs.access(file);
      // The file was recreated or moved back while the unlink event was settling.
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Could not verify removed file ${file}: ${String(error)}`);
        return;
      }
    }

    const filepath = path.relative(process.cwd(), file).split(path.sep).join('/');
    try {
      const result = await this.prisma.studentDocument.deleteMany({
        where: {
          filepath,
          documentStatus: { docuStatusName: { not: 'Trashed' } },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Removed ${result.count} stale student document record(s) for ${filepath}`);
      }
    } catch (error) {
      this.logger.error(`Could not remove stale document metadata for ${filepath}: ${String(error)}`);
    }
  }
}
