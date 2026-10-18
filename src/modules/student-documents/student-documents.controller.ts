import { BadRequestException, Controller, Delete, Get, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StudentDocumentsService } from './student-documents.service';

@Controller('students/:uuid/documents')
export class StudentDocumentsController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get()
  list(@Param('uuid') uuid: string) { return this.documents.list(uuid); }

  @Get('file')
  file(@Param('uuid') uuid: string, @Query('path') filepath: string) {
    if (!filepath) throw new BadRequestException('File path is required');
    return this.documents.download(uuid, filepath);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20, {
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!file.originalname || file.originalname.includes('\0')) return callback(new BadRequestException('Invalid filename'), false);
      callback(null, true);
    },
  }))
  upload(@Param('uuid') uuid: string, @Query('category') category: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.documents.upload(uuid, category, files);
  }

  @Delete(':docId')
  delete(@Param('uuid') uuid: string, @Param('docId') docId: string) { return this.documents.delete(uuid, docId); }
}
