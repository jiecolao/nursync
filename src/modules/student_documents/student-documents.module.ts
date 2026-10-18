import { Module } from '@nestjs/common';
import { StudentDocumentsController } from './student-documents.controller';
import { StudentTrashController } from './student-trash.controller';
import { StudentDocumentsService } from './student-documents.service';
import { AuditLogsModule } from '../audit_logs/audit_logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [StudentDocumentsController, StudentTrashController],
  providers: [StudentDocumentsService],
  exports: [StudentDocumentsService],
})
export class StudentDocumentsModule {}
