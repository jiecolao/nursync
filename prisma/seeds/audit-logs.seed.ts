import { PrismaClient } from "@prisma/client";

export async function seedAuditLogs(prisma: PrismaClient) {
  await prisma.auditLog.createMany({
    data: [
      {
        auditUuid: "00000000-0000-7000-8000-000000000201",
        userAccId: "00000000-0000-7000-8000-000000000001",
        roleId: 1,
        action: "Created seed user accounts",
      },
      {
        auditUuid: "00000000-0000-7000-8000-000000000202",
        userAccId: "00000000-0000-7000-8000-000000000002",
        roleId: 2,
        action: "Reviewed student documents",
      },
      {
        auditUuid: "00000000-0000-7000-8000-000000000203",
        userAccId: "00000000-0000-7000-8000-000000000003",
        roleId: 3,
        action: "Viewed student records",
      },
    ],
    skipDuplicates: true,
  });
}
