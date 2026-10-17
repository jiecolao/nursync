import { PrismaClient } from "@prisma/client";

export async function seedAuditLogs(prisma: PrismaClient) {
  await prisma.activityLog.createMany({
    data: [
      {
        userAccId: "00000000-0000-7000-8000-000000000001",
        roleId: 1,
        action: "Created seed user accounts",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000002",
        roleId: 2,
        action: "Reviewed student documents",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000003",
        roleId: 3,
        action: "Viewed student records",
      },
    ],
    skipDuplicates: true,
  });
}
