import { PrismaClient } from "@prisma/client";

export async function seedRoles(prisma: PrismaClient) {
  await prisma.role.createMany({
    data: [
      { roleId: 1, roleName: "Superadmin", permissionId: 1 },
      { roleId: 2, roleName: "Staff", permissionId: 2 },
      { roleId: 3, roleName: "Viewer", permissionId: 3 },
    ],
    skipDuplicates: true,
  });
}
