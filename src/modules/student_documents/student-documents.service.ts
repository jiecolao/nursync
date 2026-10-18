import {
  BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import chokidar, { FSWatcher } from 'chokidar';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const CATEGORIES = ['Academic', 'Completion & Certificate', 'Others', 'Personal', 'RLE'] as const;
const DEFAULT_STATUS_ID = 1;

@Injectable()
export class StudentDocumentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StudentDocumentsService.name);
  private watcher?: FSWatcher;
  private readonly root = path.resolve(process.env.STUDENT_DOCUMENTS_ROOT || './Database/Students');
  private readonly debounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() { void this.startWatcher(); }
  async onModuleDestroy() {
    await this.watcher?.close();
    for (const timer of this.debounce.values()) clearTimeout(timer);
  }

  async list(uuid: string) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found.');
    const documents = await this.prisma.studentDocument.findMany({
      where: { studentUuid: uuid },
      include: { documentCategories: true, documentStatus: true },
      orderBy: [{ docuId: 'asc' }, { filename: 'asc' }],
    });
    const categories = CATEGORIES.map((name) => {
      const category = documents.filter((doc) => doc.documentCategories.docuName === name);
      return { name, count: category.length, documents: category };
    });
    return { studentUuid: uuid, categories, total: documents.length };
  }

  async upload(uuid: string, files: Express.Multer.File[]) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found.');
    const categoryName = String((files[0] as Express.Multer.File & { category?: string }).category || '');
    // Multer fields are not reliably available on the file object; category is sent via query.
    const category = CATEGORIES.includes(categoryName as typeof CATEGORIES[number])
      ? categoryName
      : 'Others';
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
      const safeName = path.basename(file.originalname).replace(/[\\/\\0]/g, '_');
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

  async remove(uuid: string, docId: number) {
    const record = await this.prisma.studentDocument.findFirst({
      where: { studentUuid: uuid, docuId: docId },
    });
    if (!record) throw new NotFoundException('Document not found.');
    if (record.filepath) {
      const absolute = path.resolve(process.cwd(), record.filepath);
      const safeRoot = path.resolve(this.root);
      if (absolute !== safeRoot && !absolute.startsWith(safeRoot + path.sep)) {
        throw new BadRequestException('Document path is outside the student documents directory.');
      }
      await fs.rm(absolute, { force: true });
    }
    await this.prisma.studentDocument.delete({ where: { studentDocId: record.studentDocId } });
    return { deleted: true };
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
    try {
      const filepath = path.relative(process.cwd(), file).split(path.sep).join('/');
      await this.prisma.studentDocument.deleteMany({ where: { filepath } });
    } catch (error) {
      this.logger.error(`Could not remove document row for ${file}: ${String(error)}`);
    }
  }
}
