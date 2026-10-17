import { PrismaClient } from "@prisma/client";

export async function seedActivityLogs(prisma: PrismaClient) {
  await prisma.activityLog.createMany({
    data: [
      {
        activityUuid: "00000000-0000-7000-8000-000000000201",
        userAccId: "00000000-0000-7000-8000-000000000001",
        roleId: 1,
        adminName: "A1",
        action: "Created seed user accounts",
        description: "Created the initial seed user accounts.",
      },
      {
        activityUuid: "00000000-0000-7000-8000-000000000202",
        userAccId: "00000000-0000-7000-8000-000000000002",
        roleId: 2,
        adminName: "A2",
        action: "Reviewed student documents",
        description: "Reviewed the seeded student documents.",
      },
      {
        activityUuid: "00000000-0000-7000-8000-000000000203",
        userAccId: "00000000-0000-7000-8000-000000000003",
        roleId: 3,
        adminName: "A1",
        action: "Viewed student records",
        description: "Viewed the seeded student records.",
      },
    ],
    skipDuplicates: true,
  });
}
