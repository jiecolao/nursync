import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

const auditLogInclude = {
  user_account_role: {
    include: {
      userAccount: {
        select: {
          userAccId: true,
          username: true,
          user: {
            select: {
              userId: true,
              lastName: true,
              fastName: true,
            },
          },
        },
      },
      role: true,
    },
  },
} as const;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  getAllLogs() {
    return this.prisma.auditLog.findMany({
      include: auditLogInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLog(auditUuid: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { auditUuid },
      include: auditLogInclude,
    });

    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  createLog(body: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userAccId: body.userAccId,
        roleId: body.roleId,
        action: body.action,
      },
      include: auditLogInclude,
    });
  }

  async deleteLog(auditUuid: string) {
    await this.getLog(auditUuid);
    return this.prisma.auditLog.delete({ where: { auditUuid } });
  }
}
