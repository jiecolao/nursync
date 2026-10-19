import { PrismaClient } from "@prisma/client";

export async function seedUsers(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      {
        userId: "superadmin-001",
        facultyId: "S-0001",
        lastName: "Nursync",
        fastName: "PLM",
        genderId: 2,
      },
    ],
    skipDuplicates: true,
  });
}
