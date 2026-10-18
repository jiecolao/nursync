import { Module } from '@nestjs/common';
import { PrismaModule } from './integrations/prisma/prisma.module';
import { StudentModule } from './modules/student/student.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditLogsModule } from './modules/audit_logs/audit_logs.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { StudentDocumentsModule } from './modules/student-documents/student-documents.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    PrismaModule,
    StudentModule,
    StudentDocumentsModule,
    AdminModule,
    AuditLogsModule,
    DirectoryModule,
    LookupsModule,
  ],
})
export class AppModule {}
