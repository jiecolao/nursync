import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { HashService } from '../auth/hash.service';
import { AuditLogsService } from '../audit_logs/audit_logs.service';
import { AuthModule } from '../auth/auth.module';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, HashService, AuditLogsService, RbacGuard],
  exports: [AdminService],
})
export class AdminModule {}
