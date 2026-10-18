import { BadRequestException, Controller, Delete, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StudentDocumentsService } from './student-documents.service';

@Controller('students/:uuid/documents')
export class StudentDocumentsController {
  constructor(private readonly documents: StudentDocumentsService) {}

  @Get()
  list(@Param('uuid') uuid: string) { return this.documents.list(uuid); }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20, {
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!file.originalname || file.originalname.includes('\0')) return callback(new BadRequestException('Invalid filename'), false);
      callback(null, true);
    },
  }))
  upload(@Param('uuid') uuid: string, @UploadedFiles() files: Express.Multer.File[], @Param() _params: Record<string, string>, @UploadedFiles() _unused?: Express.Multer.File[]) {
    // Category is supplied as a query parameter by the uploader.
    return this.documents.upload(uuid, (arguments as any).category ?? 'Others', files);
  }

  @Delete(':docId')
  delete(@Param('uuid') uuid: string, @Param('docId') docId: string) { return this.documents.delete(uuid, docId); }
}
