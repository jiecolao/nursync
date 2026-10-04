import { PrismaClient } from "@prisma/client";

export async function seedPermissions(prisma: PrismaClient) {
  await prisma.permission.createMany({
    data: [
      {
        permissionId: 1,
        students_read: true,
        students_write: true,
        user_read: true,
        user_write: true,
        logs_read: true,
        logs_write: true,
      },
      {
        permissionId: 2,
        students_read: true,
        students_write: true,
        user_read: false,
        user_write: false,
        logs_read: true,
        logs_write: false,
      },
      {
        permissionId: 3,
        students_read: true,
        students_write: false,
        user_read: false,
        user_write: false,
        logs_read: false,
        logs_write: false,
      },
    ],
    skipDuplicates: true,
  });
}
