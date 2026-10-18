import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { CreateFileModificationLogDto } from './dto/create-file-modification-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('activity')
  @RequirePermissions('logs_read')
  getActivityLogs() {
    return this.auditLogsService.getActivityLogs();
  }

  @Get('activity/:id')
  @RequirePermissions('logs_read')
  getActivityLog(@Param('id') id: string) {
    return this.auditLogsService.getActivityLog(id);
  }

  @Post('activity')
  @RequirePermissions('logs_write')
  @HttpCode(HttpStatus.CREATED)
  createActivityLog(@Body() body: CreateActivityLogDto) {
    return this.auditLogsService.createActivityLog(body);
  }

  @Get('file-modifications')
  @RequirePermissions('logs_read')
  getFileModificationLogs() {
    return this.auditLogsService.getFileModificationLogs();
  }

  @Get('file-modifications/:id')
  @RequirePermissions('logs_read')
  getFileModificationLog(@Param('id') id: string) {
    return this.auditLogsService.getFileModificationLog(id);
  }

  @Post('file-modifications')
  @RequirePermissions('logs_write')
  @HttpCode(HttpStatus.CREATED)
  createFileModificationLog(@Body() body: CreateFileModificationLogDto) {
    return this.auditLogsService.createFileModificationLog(body);
  }
}
