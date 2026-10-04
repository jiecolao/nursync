import { PrismaClient } from "@prisma/client";

export async function seedUsers(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      {
        userId: "seed-user-001",
        facultyId: "FAC-0001",
        lastName: "Santos",
        fastName: "Maria",
        middleName: "Dela Cruz",
        genderId: 2,
      },
      {
        userId: "seed-user-002",
        facultyId: "FAC-0002",
        lastName: "Reyes",
        fastName: "Juan",
        middleName: "Garcia",
        genderId: 1,
      },
      {
        userId: "seed-user-003",
        facultyId: "FAC-0003",
        lastName: "Lim",
        fastName: "Alex",
        middleName: "Tan",
        genderId: 3,
      },
    ],
    skipDuplicates: true,
  });
}
