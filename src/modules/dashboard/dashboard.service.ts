import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { getFileModificationFilename } from '../audit_logs/file-modification.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      totalStudents,
      activeStudents,
      nonGraduateStudents,
      studentsByYearGraduated,
      totalDocuments,
      documentsByStatus,
      documentsByCategory,
    ] = await this.prisma.$transaction([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: true } }),
      this.prisma.student.count({ where: { yrGraduated: null } }),
      this.prisma.student.groupBy({
        by: ['yrGraduated'],
        _count: { _all: true },
        where: {
          NOT: { yrGraduated: null },
        },
        orderBy: { yrGraduated: 'asc' },
      }),
      this.prisma.studentDocument.count(),
      this.prisma.studentDocument.groupBy({
        by: ['docuStatusId'],
        _count: { _all: true },
      }),
      this.prisma.studentDocument.groupBy({
        by: ['docuId'],
        _count: { _all: true },
      }),
    ]);

    const [statuses, categories] = await Promise.all([
      this.prisma.documentStatus.findMany({
        select: { docuStatusId: true, docuStatusName: true },
      }),
      this.prisma.documentCategories.findMany({
        select: { docuId: true, docuName: true },
      }),
    ]);

    const statusNames = new Map(statuses.map((item) => [item.docuStatusId, item.docuStatusName]));
    const categoryNames = new Map(categories.map((item) => [item.docuId, item.docuName]));

    return {
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: totalStudents - activeStudents,
        nonGraduates: nonGraduateStudents,
        byYearGraduated: studentsByYearGraduated.map((item) => ({
          year: item.yrGraduated,
          count: item._count._all,
        })),
      },
      documents: {
        total: totalDocuments,
        byStatus: documentsByStatus.map((item) => ({
          statusId: item.docuStatusId,
          status: statusNames.get(item.docuStatusId) ?? 'Unknown',
          count: item._count._all,
        })),
        byCategory: documentsByCategory.map((item) => ({
          categoryId: item.docuId,
          category: categoryNames.get(item.docuId) ?? 'Unknown',
          count: item._count._all,
        })),
      },
    };
  }

  async getRecentFileChanges(limit = 10) {
    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 10;

    const logs = await this.prisma.fileModificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        fileModUuid: true,
        adminName: true,
        studentName: true,
        fileAction: true,
        fileModified: true,
        fileLoc: true,
        createdAt: true,
      },
    });

    return logs.map((log) => ({
      uuid: log.fileModUuid,
      user: log.adminName,
      student_name: log.studentName,
      file_action: log.fileAction,
      file_modified: getFileModificationFilename(log.fileModified, log.fileLoc),
      file_loc: log.fileLoc,
      date_modified: log.createdAt,
    }));
  }
}
