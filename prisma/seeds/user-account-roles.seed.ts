import { PrismaClient } from "@prisma/client";

export async function seedUserAccountRoles(prisma: PrismaClient) {
  await prisma.userAccountRole.createMany({
    data: [
      {
        userAccId: "00000-00000",
        roleId: 1,
      },
    ],
    skipDuplicates: true,
  });
}
