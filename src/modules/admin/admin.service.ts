import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const adminSelect = {
  userId: true,
  facultyId: true,
  lastName: true,
  fastName: true,
  middleName: true,
  suffix: true,
  genderId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  account: {
    select: {
      userAccId: true,
      username: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          roleId: true,
          role: {
            select: {
              roleId: true,
              roleName: true,
              permission: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  createAdmin(body: CreateAdminDto) {
    return this.prisma.user.create({
      data: {
        userId: body.userId,
        facultyId: body.facultyId,
        lastName: body.lastName,
        fastName: body.fastName,
        middleName: body.middleName,
        suffix: body.suffix,
        genderId: body.genderId,
        status: body.status,
        account: {
          create: {
            username: body.username,
            hashPass: body.hashPass,
            status: body.status,
            role: {
              create: {
                roleId: body.roleId,
              },
            },
          },
        },
      },
      select: adminSelect,
    });
  }

  async updateAdmin(userId: string, body: UpdateAdminDto) {
    await this.getAdmin(userId);

    return this.prisma.user.update({
      where: { userId },
      data: {
        facultyId: body.facultyId,
        lastName: body.lastName,
        fastName: body.fastName,
        middleName: body.middleName,
        suffix: body.suffix,
        genderId: body.genderId,
        status: body.status,
        account: {
          update: {
            username: body.username,
            hashPass: body.hashPass,
            status: body.status,
            role: body.roleId === undefined
              ? undefined
              : { update: { roleId: body.roleId } },
          },
        },
      },
      select: adminSelect,
    });
  }

  async deleteAdmin(userId: string) {
    await this.getAdmin(userId);

    return this.prisma.user.update({
      where: { userId },
      data: {
        status: false,
        account: { update: { status: false } },
      },
      select: adminSelect,
    });
  }
}
