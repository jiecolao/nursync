import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../integrations/prisma/prisma.service";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { AuditLogsService } from "../audit_logs/audit_logs.service";

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getProfile(studUuid: string) {
    const student = await this.prisma.student.findFirst({ where: { studentUuid: studUuid, status: true } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  getAllProfiles() {
    return this.prisma.student.findMany({ orderBy: { studentId: 'asc' } });
  }

  async createProfile(body: CreateStudentDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const student = await tx.student.create({ data: {
        studentId: body.studentId, firstName: body.firstName, lastName: body.lastName,
        middleName: body.middleName,
        gender: body.genderId ? { connect: { genderId: body.genderId } } : undefined,
        dob: body.dob ? new Date(body.dob) : undefined, contactNo: body.contactNo,
        email: body.email, provincialAddr: body.provincialAddr, cityAddr: body.cityAddr,
        yrAdmitted: body.yrAdmitted, yrResidency: body.yrResidency,
        yrGraduated: body.yrGraduated, isNonGraduate: body.isNonGraduate, status: body.status,
      }});
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.create',
      }, actor.adminName, JSON.stringify({ studentUuid: student.studentUuid }));
      return student;
    });
  }

  async updateProfile(studUuid: string, body: UpdateStudentDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findUnique({ where: { studentUuid: studUuid } });
      if (!oldState) throw new NotFoundException('Student not found');
      const updateData: UpdateStudentDto = {
        studentId: body.studentId, firstName: body.firstName, lastName: body.lastName,
        middleName: body.middleName, genderId: body.genderId,
        dob: body.dob ? new Date(body.dob) : undefined, contactNo: body.contactNo,
        email: body.email, provincialAddr: body.provincialAddr, cityAddr: body.cityAddr,
        yrAdmitted: body.yrAdmitted, yrResidency: body.yrResidency,
        yrGraduated: body.yrGraduated, isNonGraduate: body.isNonGraduate, status: body.status,
      };
      const updated = await tx.student.update({ where: { studentUuid: studUuid }, data: updateData });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.update',
      }, actor.adminName, JSON.stringify({ studentUuid: studUuid, oldState, newState: updated }));
      return updated;
    });
  }

  async deleteProfile(studentUuid: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findUnique({ where: { studentUuid } });
      if (!oldState) throw new NotFoundException('Student not found');
      await tx.studentDocument.deleteMany({ where: { studentUuid } });
      const deleted = await tx.student.delete({ where: { studentUuid } });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.delete',
      }, actor.adminName, JSON.stringify({ studentUuid, oldState }));
      return deleted;
    });
  }

  async deleteMultipleProfile(studentUuids: string[], actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findMany({ where: { studentUuid: { in: studentUuids } } });
      await tx.studentDocument.deleteMany({ where: { studentUuid: { in: studentUuids } } });
      const deleted = await tx.student.deleteMany({ where: { studentUuid: { in: studentUuids } } });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.bulk_delete',
      }, actor.adminName, JSON.stringify({ studentUuids, deletedCount: deleted.count, oldState }));
      return deleted;
    });
  }
}