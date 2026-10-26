import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Express } from 'express';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { HashService } from '../auth/hash.service';
import { AuditLogsService } from '../audit_logs/audit_logs.service';

const permissionKeys = [
  'students_read', 'students_write', 'user_read',
  'user_write', 'logs_read', 'logs_write',
] as const;
type PermissionFlags = Record<(typeof permissionKeys)[number], boolean>;
const defaultPermissions: PermissionFlags = {
  students_read: true, students_write: false, user_read: false,
  user_write: false, logs_read: false, logs_write: false,
};
const SUPERADMIN_USER_ID = 'superadmin-001';
function normalizePermissions(input?: Record<string, boolean>): PermissionFlags {
  if (!input) return { ...defaultPermissions };
  return Object.fromEntries(
    permissionKeys.map((key) => [key, input[key] === true]),
  ) as PermissionFlags;
}

const adminSelect = {
  userId: true,
  facultyId: true,
  lastName: true,
  fastName: true,
  middleName: true,
  suffix: true,
  genderId: true,
  photoPath: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      userAccId: true,
      username: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          roleId: true,
          role: { select: { roleId: true, roleName: true, permission: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly LogsService: AuditLogsService,
  ) {}

  getAllAdmins() {
    return this.prisma.user.findMany({
      where: { account: { isNot: null } },
      select: adminSelect,
      orderBy: { lastName: 'asc' },
    });
  }

  async getAdmin(userId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { userId, account: { isNot: null } },
      select: adminSelect,
    });
    if (!admin) throw new NotFoundException('User account not found');
    return admin;
  }

  async createAdmin(body: CreateAdminDto, actorUserId: string) {
    if (!body.password)
      throw new BadRequestException('Password is required when creating an account');
    const hashedPass = await this.hashService.hash(body.password);
    const permissions = normalizePermissions(body.permissions);
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.LogsService.resolveActorInTransaction(tx, actorUserId);
      const created = await tx.user.create({
      data: {
        ...(body.userId ? { userId: body.userId } : {}),
        facultyId: body.facultyId,
        lastName: body.lastName,
        fastName: body.fastName,
        middleName: body.middleName,
        suffix: body.suffix,
        genderId: body.genderId,
        account: {
          create: {
            username: body.username,
            email: body.email,
            hashedPass,
            hashedRefreshToken: undefined,
            status: body.status ?? true,
            role: {
              create: {
                role: {
                  create: {
                    roleName: `Custom-${randomUUID()}`,
                    permission: { create: permissions },
                  },
                },
              },
            },
          },
        },
      },
      select: adminSelect,
    });
      await this.LogsService.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.create' }, actor.adminName, JSON.stringify({ userId: created.userId, username: body.username }));
      return created;
    });
  }

  async updateAdmin(userId: string, body: UpdateAdminDto, actorUserId: string) {
    const hashedPass = body.password ? await this.hashService.hash(body.password) : undefined;
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.LogsService.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.user.findFirst({ where: { userId, account: { isNot: null } }, select: adminSelect });
      if (!oldState) throw new NotFoundException('User account not found');
      let roleId: number | undefined;
      if (body.permissions) {
        const permission = await tx.permission.create({ data: normalizePermissions(body.permissions) });
        const role = await tx.role.create({ data: { roleName: `Custom-${randomUUID()}`, permissionId: permission.permissionId } });
        roleId = role.roleId;
      }
      const updated = await tx.user.update({
        where: { userId },
        data: {
          facultyId: body.facultyId, lastName: body.lastName, fastName: body.fastName,
          middleName: body.middleName, suffix: body.suffix, genderId: body.genderId,
          account: { update: {
            username: body.username, email: body.email, status: body.status, hashedPass,
            hashedRefreshToken: undefined,
            role: roleId !== undefined ? { update: { roleId } } : body.roleId === undefined ? undefined : { update: { roleId: body.roleId } },
          } },
        },
        select: adminSelect,
      });
      await this.LogsService.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.update',
      }, actor.adminName, JSON.stringify({ userId, changedFields: Object.keys(body).filter((key) => key !== 'password' && key !== 'hashedRefreshToken') }));
      return updated;
    });
  }

  async updateOwnProfile(userAccId: string, body: UpdateAdminDto) {
    const account = await this.prisma.userAccount.findUnique({
      where: { userAccId },
      select: { userId: true },
    });
    if (!account) throw new NotFoundException('User account not found');
    return this.updateAdmin(account.userId, body, userAccId);
  }

  async updateOwnProfilePhoto(userAccId: string, photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('An image file is required');

    const account = await this.prisma.userAccount.findUnique({
      where: { userAccId },
      select: { userId: true, user: { select: { lastName: true, photoPath: true } } },
    });
    if (!account) throw new NotFoundException('User account not found');

    const directory = path.resolve(process.env.ADMIN_PROFILE_PIC_PATH || './Database/Admin/Pictures');
    await fs.mkdir(directory, { recursive: true });

    const extension = this.imageExtension(photo.mimetype);
    const fileName = `${this.sanitizeLastName(account.user.lastName)}_${account.userId.slice(-4)}.${extension}`;
    const targetPath = path.join(directory, fileName);
    const relativePath = `/admin-profile-pictures/${encodeURIComponent(fileName)}`;

    await fs.writeFile(targetPath, photo.buffer);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.user.update({
          where: { userId: account.userId },
          data: { photoPath: relativePath },
          select: { photoPath: true },
        });
        const actor = await this.LogsService.resolveActorInTransaction(tx, userAccId);
        await this.LogsService.createActivityLogInTransaction(
          tx,
          { userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.photo_update' },
          actor.adminName,
          JSON.stringify({ userId: account.userId, photoPath: relativePath }),
        );
        return result;
      });

      if (account.user.photoPath && account.user.photoPath !== relativePath) {
        const oldFileName = decodeURIComponent(path.basename(account.user.photoPath));
        if (oldFileName !== fileName) {
          await fs.rm(path.join(directory, oldFileName), { force: true });
        }
      }
      return updated;
    } catch (error) {
      await fs.rm(targetPath, { force: true });
      throw error;
    }
  }

  private sanitizeLastName(lastName: string) {
    const sanitized = lastName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return sanitized || 'USER';
  }

  private imageExtension(mimeType: string) {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/avif': 'avif',
    };
    return extensions[mimeType.toLowerCase()] ?? 'bin';
  }

  async updateOwnPassword(userAccId: string, currentPassword: string, newPassword: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { userAccId },
      select: { userId: true, hashedPass: true },
    });
    if (!account) throw new NotFoundException('User account not found');
    if (!(await this.hashService.verify(account.hashedPass, currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    return this.updatePass(account.userId, newPassword, userAccId);
  }

  async updateOwnStatus(userAccId: string, status: boolean) {
    const account = await this.prisma.userAccount.findUnique({
      where: { userAccId },
      select: { userId: true },
    });
    if (!account) throw new NotFoundException('User account not found');
    return this.updateStatus(account.userId, status, userAccId);
  }

  async updatePass(userId: string, pass: string, actorUserId: string) {
    const hashedPass = await this.hashService.hash(pass);
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.LogsService.resolveActorInTransaction(tx, actorUserId);
      const target = await tx.user.findFirst({ where: { userId, account: { isNot: null } } });
      if (!target) throw new NotFoundException('User account not found');
      await tx.user.update({ where: { userId }, data: { account: { update: { hashedPass } } } });
      await this.LogsService.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.password_update' }, actor.adminName, JSON.stringify({ userId }));
      return { updated: true };
    });
  }

  async updateStatus(userId: string, status: boolean, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.LogsService.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.user.findFirst({ where: { userId, account: { isNot: null } }, select: adminSelect });
      if (!oldState) throw new NotFoundException('User account not found');
      const updated = await tx.user.update({ where: { userId }, data: { account: { update: { status } } }, select: adminSelect });
      await this.LogsService.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.status_update' }, actor.adminName, JSON.stringify({ userId, oldStatus: oldState.account?.status, newStatus: status }));
      return updated;
    });
  }

  async deleteAdmin(userId: string, actorUserId: string) {
    if (userId === SUPERADMIN_USER_ID) {
      throw new ForbiddenException('The superadmin account cannot be deleted');
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await this.LogsService.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.user.findFirst({ where: { userId, account: { isNot: null } }, select: adminSelect });
      if (!oldState) throw new NotFoundException('User account not found');
      const updated = await tx.user.update({ where: { userId }, data: { account: { update: { status: false } } }, select: adminSelect });
      await this.LogsService.createActivityLogInTransaction(tx, { userAccId: actor.userAccId, roleId: actor.roleId, action: 'admin.deactivate' }, actor.adminName, JSON.stringify({ userId, previousStatus: oldState.account?.status, newStatus: false }));
      return updated;
    });
  }
}
