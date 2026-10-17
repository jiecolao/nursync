import { PrismaClient } from "@prisma/client";

export async function seedFileModificationLogs(prisma: PrismaClient) {
  await prisma.fileModificationLog.createMany({
    data: [
      {
        fileModUuid: "00000000-0000-7000-8000-000000000301",
        userAccId: "00000000-0000-7000-8000-000000000001",
        roleId: 1,
        adminName: "Maria Dela Cruz Santos",
        studentName: "Ana Lopez Garcia",
        fileAction: "Uploaded",
        fileModified: "Uploaded ana-personal-records.pdf.",
        fileLoc: "seed/ana-personal-records.pdf",
      },
      {
        fileModUuid: "00000000-0000-7000-8000-000000000302",
        userAccId: "00000000-0000-7000-8000-000000000002",
        roleId: 2,
        adminName: "Juan Garcia Reyes",
        studentName: "Ben Santos Dela Cruz",
        fileAction: "Reviewed",
        fileModified: "Reviewed ben-academic-records.pdf.",
        fileLoc: "seed/ben-academic-records.pdf",
      },
      {
        fileModUuid: "00000000-0000-7000-8000-000000000303",
        userAccId: "00000000-0000-7000-8000-000000000003",
        roleId: 3,
        adminName: "Alex Tan Lim",
        studentName: "Casey Lim Tan",
        fileAction: "Viewed",
        fileModified: "Viewed casey-clinical-records.pdf.",
        fileLoc: "seed/casey-clinical-records.pdf",
      },
    ],
    skipDuplicates: true,
  });
}
