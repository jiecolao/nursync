import { BadRequestException, Controller, Post, Body, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { StudentBulkImportService } from './student-bulk-import.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('student-documents/import')
@UseGuards(JwtAuthGuard)
export class StudentBulkImportController {
  constructor(private readonly imports: StudentBulkImportService) {}

  @Post('preview')
  preview(@Body('paths') paths: string[]) {
    return this.imports.preview(paths);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 500, { limits: { fileSize: 25 * 1024 * 1024, files: 500 } }))
  import(@UploadedFiles() files: Express.Multer.File[], @Body('paths') paths: string, @Req() req: AuthenticatedRequest) {
    if (!files?.length) throw new BadRequestException('Select at least one file.');
    if (!paths) throw new BadRequestException('Import folder paths are required.');
    return this.imports.importFiles(files, paths, req.user.sub);
  }
}
