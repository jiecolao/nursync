import { Module } from '@nestjs/common';
import { PrismaModule } from './integrations/prisma/prisma.module';
import { StudentModule } from './modules/student/student.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditLogsModule } from './modules/audit_logs/audit_logs.module';

@Module({
  imports: [
    PrismaModule, 
    StudentModule, 
    AdminModule, 
    AuditLogsModule
  ],
})
export class AppModule {}
