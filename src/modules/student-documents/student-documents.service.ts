import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import chokidar, { FSWatcher } from 'chokidar';

const CATEGORIES = ['Academic', 'Completion & Certificate', 'Others', 'Personal', 'RLE'] as const;
type Category = typeof CATEGORIES[number];

@Injectable()
export class StudentDocumentsService implements OnModuleInit, OnModuleDestroy {
  private watcher?: FSWatcher;
  private readonly root = path.resolve(process.env.STUDENT_DOCUMENTS_ROOT ?? path.join(process.cwd(), 'Database', 'Students'));

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await fs.mkdir(this.root, { recursive: true });
    this.watcher = chokidar.watch(this.root, { ignoreInitial: false, awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }, ignored: /(^|[/\\])\./ });
    this.watcher.on('add', file => void this.syncFile(file));
    this.watcher.on('unlink', file => void this.removeFileRecord(file));
    this.watcher.on('change', file => void this.syncFile(file));
    this.watcher.on('error', error => console.error('[student-documents] watcher error', error));
  }

  async onModuleDestroy() { await this.watcher?.close(); }

  private async resolvePath(uuid: string, category: string) {
    if (!CATEGORIES.includes(category as Category)) throw new BadRequestException('Unknown document category');
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found');
    return { student, dir: path.join(this.root, `${student.lastName}, ${student.firstName}`, category) };
  }

  private async categoryId(category: string) {
    const record = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
    if (!record) throw new BadRequestException(`Document category "${category}" is missing from Document_categories`);
    return record.docuId;
  }

  async list(uuid: string) {
    const student = await this.prisma.student.findUnique({ where: { studentUuid: uuid } });
    if (!student) throw new NotFoundException('Student not found');
    const docs = await this.prisma.studentDocument.findMany({
      where: { studentUuid: uuid }, include: { documentCategories: true, documentStatus: true }, orderBy: { submittedAt: 'desc' },
    });
    const categories = CATEGORIES.map(name => {
      const items = docs.filter(d => d.documentCategories.docuName === name);
      return { name, count: items.length, documents: items };
    });
    return { categories, total: docs.length };
  }

  async upload(uuid: string, category: string, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Choose at least one file');
    const { student, dir } = await this.resolvePath(uuid, category);
    const docuId = await this.categoryId(category);
    const defaultStatus = await this.prisma.documentStatus.findFirst({ orderBy: { docuStatusId: 'asc' } });
    if (!defaultStatus) throw new BadRequestException('No document statuses are configured');
    await fs.mkdir(dir, { recursive: true });
    const results = [];
    for (const file of files) {
      const safeName = path.basename(file.originalname).replace(/[\\/\0]/g, '_');
      let filename = safeName;
      let target = path.join(dir, filename);
      if (await fs.stat(target).catch(() => null)) {
        const ext = path.extname(safeName); filename = `${path.basename(safeName, ext)}-${randomUUID().slice(0, 8)}${ext}`; target = path.join(dir, filename);
      }
      await fs.writeFile(target, file.buffer, { flag: 'wx' });
      const filepath = path.relative(process.cwd(), target);
      // The watcher may have already indexed the new file; reuse that row instead of duplicating it.
      const existing = await this.prisma.studentDocument.findFirst({ where: { filepath } });
      const data = { studentUuid: student.studentUuid, docuId, filename, filepath, submittedAt: new Date(), docuStatusId: defaultStatus.docuStatusId };
      const record = existing
        ? await this.prisma.studentDocument.update({ where: { studentDocId: existing.studentDocId }, data, include: { documentCategories: true, documentStatus: true } })
        : await this.prisma.studentDocument.create({ data: { studentDocId: randomUUID(), ...data }, include: { documentCategories: true, documentStatus: true } });
      results.push(record);
    }
    return { uploaded: results.length, documents: results };
  }

  async download(uuid: string, filepath: string) {
    const doc = await this.prisma.studentDocument.findFirst({ where: { studentUuid: uuid, filepath } });
    if (!doc?.filepath) throw new NotFoundException('Document not found');
    const target = path.resolve(process.cwd(), doc.filepath);
    if (!target.startsWith(this.root + path.sep)) throw new BadRequestException('Document path is outside the managed directory');
    await fs.access(target);
    const extension = path.extname(target).toLowerCase();
    const type = extension === '.pdf' ? 'application/pdf' : extension === '.txt' ? 'text/plain; charset=utf-8' : 'application/octet-stream';
    return new StreamableFile(createReadStream(target), { type, disposition: `inline; filename="${path.basename(doc.filename ?? target).replace(/["\\\r\n]/g, '_')}"` });
  }

  async delete(uuid: string, docId: string) {
    const doc = await this.prisma.studentDocument.findFirst({ where: { studentDocId: docId, studentUuid: uuid } });
    if (!doc) throw new NotFoundException('Document not found');
    const target = path.resolve(process.cwd(), doc.filepath ?? '');
    if (!target.startsWith(this.root + path.sep)) throw new BadRequestException('Document path is outside the managed directory');
    await fs.unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await this.prisma.studentDocument.delete({ where: { studentDocId: docId } });
    return { deleted: true };
  }

  private async syncFile(file: string) {
    try {
      const relative = path.relative(this.root, file);
      const parts = relative.split(path.sep);
      if (parts.length !== 3 || !CATEGORIES.includes(parts[1] as Category)) return;
      const [studentFolder, category, filename] = parts;
      const [lastName, ...firstParts] = studentFolder.split(', ');
      if (!lastName || !firstParts.length) return;
      const student = await this.prisma.student.findFirst({ where: { lastName, firstName: firstParts.join(', ') } });
      const categoryRecord = await this.prisma.documentCategories.findFirst({ where: { docuName: category } });
      const status = await this.prisma.documentStatus.findFirst({ orderBy: { docuStatusId: 'asc' } });
      if (!student || !categoryRecord || !status) return;
      const filepath = path.relative(process.cwd(), file);
      const existing = await this.prisma.studentDocument.findFirst({ where: { filepath } });
      if (existing) {
        await this.prisma.studentDocument.update({ where: { studentDocId: existing.studentDocId }, data: { filename, filepath, docuId: categoryRecord.docuId, studentUuid: student.studentUuid } });
        return;
      }
      await this.prisma.studentDocument.create({ data: {
        studentDocId: randomUUID(), studentUuid: student.studentUuid, docuId: categoryRecord.docuId,
        filename, filepath, submittedAt: new Date(), docuStatusId: status.docuStatusId,
      } });
    } catch (error) { console.error('[student-documents] sync failed', file, error); }
  }

  private async removeFileRecord(file: string) {
    try {
      const filepath = path.relative(process.cwd(), file);
      await this.prisma.studentDocument.deleteMany({ where: { filepath } });
    } catch (error) { console.error('[student-documents] remove sync failed', file, error); }
  }
}
