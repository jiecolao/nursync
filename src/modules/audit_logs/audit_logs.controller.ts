import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { CreateFileModificationLogDto } from './dto/create-file-modification-log.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('activity')
  getActivityLogs() {
    return this.auditLogsService.getActivityLogs();
  }

  @Get('activity/:id')
  getActivityLog(@Param('id') id: string) {
    return this.auditLogsService.getActivityLog(id);
  }

  @Post('activity')
  @HttpCode(HttpStatus.CREATED)
  createActivityLog(@Body() body: CreateActivityLogDto) {
    return this.auditLogsService.createActivityLog(body);
  }

  @Get('file-modifications')
  getFileModificationLogs() {
    return this.auditLogsService.getFileModificationLogs();
  }

  @Get('file-modifications/:id')
  getFileModificationLog(@Param('id') id: string) {
    return this.auditLogsService.getFileModificationLog(id);
  }

  @Post('file-modifications')
  @HttpCode(HttpStatus.CREATED)
  createFileModificationLog(@Body() body: CreateFileModificationLogDto) {
    return this.auditLogsService.createFileModificationLog(body);
  }
}
