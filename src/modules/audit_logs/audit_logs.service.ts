import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { CreateFileModificationLogDto } from './dto/create-file-modification-log.dto';

const activityLogInclude = {
  user: { include: { role: true, userAccount: true } },
} as const;

const fileModificationLogInclude = {
  user: { include: { role: true, userAccount: true } },
} as const;

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the actor from the verified JWT subject using the transaction client. */
  async resolveActorInTransaction(tx: TransactionClient, userId: string) {
    const account = await tx.userAccount.findUnique({
      where: { userId },
      include: { user: true, role: { include: { role: true } } },
    });
    if (!account || !account.role) {
      throw new NotFoundException('Authenticated account or active role not found');
    }
    return {
      userAccId: account.userAccId,
      roleId: account.role.roleId,
      adminName: [account.user.lastName, account.user.fastName].filter(Boolean).join(', '),
    };
  }

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
    if (!log) throw new NotFoundException('Activity log not found');
    return log;
  }

  /**
   * Write the audit event using the caller's transaction client. Call this from
   * the same $transaction callback as the business mutation; do not use the
   * root PrismaService client here, or a failed mutation could leave a success
   * event behind.
   */
  createActivityLogInTransaction(
    tx: TransactionClient,
    body: CreateActivityLogDto,
    adminName: string,
    description = '',
  ) {
    return tx.activityLog.create({
      data: {
        userAccId: body.userAccId,
        roleId: body.roleId,
        adminName,
        action: body.action,
        description,
      },
      include: activityLogInclude,
    });
  }

  /** Backwards-compatible standalone API for explicit manual log creation. */
  createActivityLog(body: CreateActivityLogDto) {
    return this.prisma.$transaction((tx) =>
      this.createActivityLogInTransaction(tx, body, body.userAccId),
    );
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
    if (!log) throw new NotFoundException('File modification log not found');
    return log;
  }

  /**
   * Persist file-operation details in the caller's transaction. Encode
   * old/new state as JSON in fileModified so existing deployments can use the
   * audit format without silently changing the current database schema.
   */
  createFileModificationLogInTransaction(
    tx: TransactionClient,
    body: CreateFileModificationLogDto,
    adminName: string,
    oldState?: unknown,
    newState?: unknown,
  ) {
    const state = JSON.stringify({ oldState: oldState ?? null, newState: newState ?? null });
    return tx.fileModificationLog.create({
      data: {
        userAccId: body.userAccId,
        roleId: body.roleId,
        adminName,
        studentName: body.studentName,
        fileAction: body.fileAction,
        fileModified: body.fileModified || state,
        fileLoc: body.fileLoc,
      },
      include: fileModificationLogInclude,
    });
  }

  /** Backwards-compatible standalone API for explicit manual log creation. */
  createFileModificationLog(body: CreateFileModificationLogDto) {
    return this.prisma.$transaction((tx) =>
      this.createFileModificationLogInTransaction(tx, body, body.userAccId),
    );
  }
}
