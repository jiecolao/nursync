import {
  BadRequestException, Controller, Delete, Get, Param, Query, Res,
  Post, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { StudentDocumentsService } from './student-documents.service';

@Controller('students/:uuid/documents')
export class StudentDocumentsController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get()
  list(@Param('uuid') uuid: string) {
    return this.documents.list(uuid);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20, {
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  upload(
    @Param('uuid') uuid: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('category') category: string,
  ) {
    if (!files?.length) throw new BadRequestException('Select at least one file.');
    return this.documents.upload(uuid, files, category);
  }

  @Delete(':docId')
  remove(
    @Param('uuid') uuid: string,
    @Param('docId') docId: string,
  ) {
    return this.documents.remove(uuid, docId);
  }

  @Get('file')
  async file(@Query('path') filepath: string, @Query('download') download: string, @Res() response: Response) {
    if (!filepath) throw new BadRequestException('File path is required.');
    const absolute = await this.documents.resolveFile(filepath);
    response.setHeader('Content-Type', this.contentType(absolute));
    response.setHeader('Content-Disposition', `${download === '1' ? 'attachment' : 'inline'}; filename="${path.basename(absolute).replace(/[\\"\\r\\n]/g, '')}"`);
    createReadStream(absolute).pipe(response);
  }

  private contentType(file: string) {
    const ext = path.extname(file).toLowerCase();
    return ext === '.pdf' ? 'application/pdf' : ext === '.txt' ? 'text/plain; charset=utf-8' : 'application/octet-stream';
  }
}
