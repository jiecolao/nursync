import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit_logs.controller';
import { AuditLogsService } from './audit_logs.service';
import { AuthModule } from '../auth/auth.module';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, RbacGuard],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
