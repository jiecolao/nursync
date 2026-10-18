import {
  BadRequestException, Controller, Delete, Get, Param, Query, Res, Req,
  Post, UploadedFiles, UseInterceptors, UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
type AuthenticatedRequest = Request & { user: { sub: string } };
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { StudentDocumentsService } from './student-documents.service';

@Controller('students/:uuid/documents')
@UseGuards(JwtAuthGuard)
export class StudentDocumentsController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get('trash')
  listTrash() {
    return this.documents.listTrash();
  }

  @Post('trash/:docId/restore')
  restore(@Param('docId') docId: string, @Req() req: AuthenticatedRequest) {
    return this.documents.restoreFromTrash(docId, req.user.sub);
  }

  @Delete('trash/:docId/permanent')
  permanentlyDelete(@Param('docId') docId: string) {
    return this.documents.permanentlyDelete(docId);
  }

  @Delete('trash')
  emptyTrash() {
    return this.documents.emptyTrash();
  }

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
    @Req() req: AuthenticatedRequest,
  ) {
    if (!files?.length) throw new BadRequestException('Select at least one file.');
    return this.documents.upload(uuid, files, category, req.user.sub);
  }

  @Delete(':docId')
  remove(
    @Param('uuid') uuid: string,
    @Param('docId') docId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documents.remove(uuid, docId, req.user.sub);
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
