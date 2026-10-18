import { BadRequestException, Controller, Delete, Get, Param, Post, Query, Res, Req, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
type AuthenticatedRequest = Request & { user: { sub: string } };
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { StudentDocumentsService } from './student-documents.service';

@Controller('student-documents/trash')
@UseGuards(JwtAuthGuard)
export class StudentTrashController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get('file')
  async file(@Query('path') filepath: string, @Res() response: Response) {
    if (!filepath) throw new BadRequestException('File path is required.');
    const absolute = await this.documents.resolveFile(filepath);
    const ext = path.extname(absolute).toLowerCase();
    response.setHeader('Content-Type', ext === '.pdf' ? 'application/pdf' : ext === '.txt' ? 'text/plain; charset=utf-8' : 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename="${path.basename(absolute).replace(/[\\"\\r\\n]/g, '')}"`);
    createReadStream(absolute).pipe(response);
  }

  @Get()
  list() {
    return this.documents.listTrash();
  }

  @Post(':docId/restore')
  restore(@Param('docId') docId: string, @Req() req: AuthenticatedRequest) {
    return this.documents.restoreFromTrash(docId, req.user.sub);
  }

  @Delete(':docId')
  permanentlyDelete(@Param('docId') docId: string, @Req() req: AuthenticatedRequest) {
    return this.documents.permanentlyDelete(docId, req.user.sub);
  }

  @Delete()
  empty(@Req() req: AuthenticatedRequest) {
    return this.documents.emptyTrash(req.user.sub);
  }
}
