import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { AuthModule } from '../auth/auth.module';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  imports: [AuthModule],
  controllers: [StudentController],
  providers: [StudentService, RbacGuard],
  exports: [StudentService],
})

export class StudentModule {}