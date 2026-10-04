import { PrismaClient } from "@prisma/client";

export async function seedUserAccountRoles(prisma: PrismaClient) {
  await prisma.userAccountRole.createMany({
    data: [
      {
        userAccId: "00000000-0000-7000-8000-000000000001",
        roleId: 1,
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000002",
        roleId: 2,
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000003",
        roleId: 3,
      },
    ],
    skipDuplicates: true,
  });
}
