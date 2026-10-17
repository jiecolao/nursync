import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { CreateFileModificationLogDto } from './dto/create-file-modification-log.dto';

const activityLogInclude = {
  role: true,
  user: {
    include: {
      userAccount: true,
    },
  },
} as const;

const fileModificationLogInclude = {
  role: true,
  user: {
    include: {
      userAccount: true,
    },
  },
} as const;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  getActivityLogs() {
    return this.prisma.activityLog.findMany({
      include: activityLogInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActivityLog(activityUuid: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { activityUuid },
      include: activityLogInclude,
    });

    if (!log) {
      throw new NotFoundException('Activity log not found');
    }

    return log;
  }

  createActivityLog(body: CreateActivityLogDto) {
    return this.prisma.activityLog.create({
      data: {
        userAccId: body.userAccId,
        roleId: body.roleId,
        action: body.action,
      },
      include: activityLogInclude,
    });
  }

  getFileModificationLogs() {
    return this.prisma.fileModificationLog.findMany({
      include: fileModificationLogInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileModificationLog(fileModUuid: string) {
    const log = await this.prisma.fileModificationLog.findUnique({
      where: { fileModUuid },
      include: fileModificationLogInclude,
    });

    if (!log) {
      throw new NotFoundException('File modification log not found');
    }

    return log;
  }

  createFileModificationLog(body: CreateFileModificationLogDto) {
    return this.prisma.fileModificationLog.create({
      data: {
        userAccId: body.userAccId,
        roleId: body.roleId,
        studentName: body.studentName,
        fileAction: body.fileAction,
        fileModified: body.fileModified,
        fileLoc: body.fileLoc,
      },
      include: fileModificationLogInclude,
    });
  }
}
