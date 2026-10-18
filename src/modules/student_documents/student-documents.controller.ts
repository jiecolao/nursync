import {
  BadRequestException, Controller, Delete, Get, Param, ParseIntPipe,
  Post, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
  ) {
    if (!files?.length) throw new BadRequestException('Select at least one file.');
    return this.documents.upload(uuid, files);
  }

  @Delete(':docId')
  remove(
    @Param('uuid') uuid: string,
    @Param('docId', ParseIntPipe) docId: number,
  ) {
    return this.documents.remove(uuid, docId);
  }
}
