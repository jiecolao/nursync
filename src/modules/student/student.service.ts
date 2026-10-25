import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../integrations/prisma/prisma.service";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { AuditLogsService } from "../audit_logs/audit_logs.service";
import { promises as fs } from "node:fs";
import path from "node:path";
import sanitize from "sanitize-filename";

const STUDENT_DOCUMENTS_ROOT = path.resolve(
  process.env.STUDENT_DOCUMENTS_ROOT || "./Database/Students",
);

function batchFolderFor(student: {
  yrGraduated: number | null;
  isNonGraduate?: boolean | null;
}) {
  if (student.isNonGraduate) {
    return "NON-GRADUATE";
  }

  if (student.yrGraduated) {
    return `BATCH ${student.yrGraduated}`;
  }

  // TODO: Any non-graduates and no yr graduates automatically falls in this. 
  return "NON-GRADUATE";
}

function studentFolderFor(student: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  const givenNames = [student.firstName, student.middleName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const folder = sanitize(`${student.lastName.trim().toUpperCase()}, ${givenNames}`);
  if (!folder || folder === "." || folder === "..") {
    throw new Error("Unable to create a safe student folder name.");
  }
  return folder;
}

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
    const student = await this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const created = await tx.student.create({ data: {
        studentId: body.studentId, firstName: body.firstName, lastName: body.lastName.toUpperCase(),
        middleName: body.middleName,
        gender: body.genderId ? { connect: { genderId: body.genderId } } : undefined,
        dob: body.dob ? new Date(body.dob) : undefined, contactNo: body.contactNo,
        email: body.email, provincialAddr: body.provincialAddr, cityAddr: body.cityAddr,
        yrAdmitted: body.yrAdmitted, yrResidency: body.yrResidency,
        yrGraduated: body.yrGraduated, isNonGraduate: body.isNonGraduate, status: body.status,
      }});
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.create',
      }, actor.adminName, JSON.stringify({ studentUuid: created.studentUuid }));
      return created;
    });

    // Keep the on-disk directory tree discoverable even on a brand-new install.
    // DirectoryService watches this root and publishes addDir events to connected
    // clients, so the Records/Directory view updates without a manual refresh.
    const batchPath = path.resolve(STUDENT_DOCUMENTS_ROOT, batchFolderFor(student));
    const studentPath = path.resolve(batchPath, studentFolderFor(student));
    if (!batchPath.startsWith(STUDENT_DOCUMENTS_ROOT + path.sep)
      || !studentPath.startsWith(batchPath + path.sep)) {
      throw new Error("Invalid student directory path.");
    }
    await fs.mkdir(studentPath, { recursive: true });
    return student;
  }

  async updateProfile(studUuid: string, body: UpdateStudentDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findUnique({ where: { studentUuid: studUuid } });
      if (!oldState) throw new NotFoundException('Student not found');
      const updateData: UpdateStudentDto = {
        studentId: body.studentId, firstName: body.firstName, lastName: body.lastName?.toUpperCase(),
        middleName: body.middleName, genderId: body.genderId,
        dob: body.dob ? new Date(body.dob) : undefined, contactNo: body.contactNo,
        email: body.email, provincialAddr: body.provincialAddr, cityAddr: body.cityAddr,
        yrAdmitted: body.yrAdmitted, yrResidency: body.yrResidency,
        yrGraduated: body.yrGraduated, isNonGraduate: body.isNonGraduate, status: body.status,
      };
      const updated = await tx.student.update({ where: { studentUuid: studUuid }, data: updateData });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.update',
      }, actor.adminName, JSON.stringify({ studentUuid: studUuid, changedFields: Object.keys(body).filter((key) => key !== 'password') }));
      return updated;
    });
  }

  async deleteProfile(studentUuid: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findUnique({ where: { studentUuid } });
      if (!oldState) throw new NotFoundException('Student not found');
      const documents = await tx.studentDocument.deleteMany({ where: { studentUuid } });
      await tx.student.delete({ where: { studentUuid } });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId, roleId: actor.roleId, action: 'student.delete',
      }, actor.adminName, JSON.stringify({
        studentUuid,
        previousStatus: oldState.status,
        deletedDocumentCount: documents.count,
      }));
      return { deleted: true, studentUuid, deletedDocumentCount: documents.count };
    });
  }

  async deleteMultipleProfile(studentUuids: string[], actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.auditLogs.resolveActorInTransaction(tx, actorUserId);
      const oldState = await tx.student.findMany({ where: { studentUuid: { in: studentUuids } } });
      const documents = await tx.studentDocument.deleteMany({
        where: { studentUuid: { in: studentUuids } },
      });
      const deleted = await tx.student.deleteMany({
        where: { studentUuid: { in: studentUuids } }
      });
      await this.auditLogs.createActivityLogInTransaction(tx, {
        userAccId: actor.userAccId,
        roleId: actor.roleId,
        action: 'student.bulk_delete',
      }, actor.adminName, JSON.stringify({
        studentUuids,
        deletedCount: deleted.count,
        deletedDocumentCount: documents.count,
        oldState
      }));
      return deleted;
    });
  }
}
