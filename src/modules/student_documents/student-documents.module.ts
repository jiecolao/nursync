import { Module } from '@nestjs/common';
import { StudentDocumentsController } from './student-documents.controller';
import { StudentTrashController } from './student-trash.controller';
import { StudentDocumentsService } from './student-documents.service';

@Module({
  controllers: [StudentDocumentsController, StudentTrashController],
  providers: [StudentDocumentsService],
  exports: [StudentDocumentsService],
})
export class StudentDocumentsModule {}
