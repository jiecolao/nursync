import { Module } from '@nestjs/common';
import { PrismaModule } from './integrations/prisma/prisma.module';
import { StudentModule } from './modules/student/student.module';
import { StudentDocumentsModule } from './modules/student_documents/student-documents.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditLogsModule } from './modules/audit_logs/audit_logs.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [  
    ThrottlerModule.forRoot([{ 
      ttl: 60000, 
      limit: 5,
    }]), // 5 requests per minute
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