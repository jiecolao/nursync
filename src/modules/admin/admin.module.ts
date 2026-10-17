import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { HashService } from '../auth/hash.service';
import { AuditLogsService } from '../audit_logs/audit_logs.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, HashService, AuditLogsService],
  exports: [AdminService],
})
export class AdminModule {}
