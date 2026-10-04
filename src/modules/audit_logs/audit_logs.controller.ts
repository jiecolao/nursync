import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  getAllLogs() {
    return this.auditLogsService.getAllLogs();
  }

  @Get(':id')
  getLog(@Param('id') id: string) {
    return this.auditLogsService.getLog(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createLog(@Body() log: CreateAuditLogDto) {
    return this.auditLogsService.createLog(log);
  }

  @Delete(':id')
  deleteLog(@Param('id') id: string) {
    return this.auditLogsService.deleteLog(id);
  }
}
