import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { HashService } from '../auth/hash.service';
import { AuditLogsService } from '../audit_logs/audit_logs.service';

const adminSelect = {
  userId: true, facultyId: true, lastName: true, fastName: true, middleName: true, suffix: true, genderId: true, status: true, createdAt: true, updatedAt: true,
  account: { select: { userAccId: true, username: true, email: true, status: true, createdAt: true, updatedAt: true,
    role: { select: { roleId: true, role: { select: { roleId: true, roleName: true, permission: true } } } } } },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly hashService: HashService, private readonly LogsService: AuditLogsService) {}
  getAllAdmins() { return this.prisma.user.findMany({ where: { account: { isNot: null } }, select: adminSelect, orderBy: { lastName: 'asc' } }); }
  async getAdmin(userId: string) {
    const admin = await this.prisma.user.findFirst({ where: { userId, account: { isNot: null } }, select: adminSelect });
    if (!admin) throw new NotFoundException('User account not found');
    return admin;
  }
  async createAdmin(body: CreateAdminDto) {
    if (!body.password) throw new BadRequestException('Password is required when creating an account');
    const hashedPass = await this.hashService.hash(body.password);
    return this.prisma.user.create({ data: {
      ...(body.userId ? { userId: body.userId } : {}), facultyId: body.facultyId, lastName: body.lastName, fastName: body.fastName,
      middleName: body.middleName, suffix: body.suffix, genderId: body.genderId,
      account: { create: { username: body.username, email: body.email, hashedPass, hashedRefreshToken: body.hashedRefreshToken,
        status: body.status ?? true, role: { create: { roleId: body.roleId } } } },
    }, select: adminSelect });
  }
  async updateAdmin(userId: string, body: UpdateAdminDto) {
    await this.getAdmin(userId);
    const hashedPass = body.password ? await this.hashService.hash(body.password) : undefined;
    return this.prisma.user.update({ where: { userId }, data: {
      facultyId: body.facultyId, lastName: body.lastName, fastName: body.fastName, middleName: body.middleName, suffix: body.suffix, genderId: body.genderId,
      account: { update: { username: body.username, email: body.email, status: body.status, hashedPass, hashedRefreshToken: body.hashedRefreshToken,
        role: body.roleId === undefined ? undefined : { update: { roleId: body.roleId } } } },
    }, select: adminSelect });
  }
  async updatePass(userId: string, pass: string) {
    await this.getAdmin(userId); const hashedPass = await this.hashService.hash(pass);
    return this.prisma.user.update({ where: { userId }, data: { account: { update: { hashedPass } } } });
  }
  async updateStatus(userId: string, status: boolean) {
    await this.getAdmin(userId);
    return this.prisma.user.update({ where: { userId }, data: { account: { update: { status } } } });
  }
  async deleteAdmin(userId: string) {
    await this.getAdmin(userId);
    return this.prisma.user.update({ where: { userId }, data: { status: false, account: { update: { status: false } } }, select: adminSelect });
  }
}