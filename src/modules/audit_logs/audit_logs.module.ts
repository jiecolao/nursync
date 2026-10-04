import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit_logs.controller';
import { AuditLogsService } from './audit_logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
