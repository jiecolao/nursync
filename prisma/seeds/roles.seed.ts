import { PrismaClient } from "@prisma/client";

export async function seedRoles(prisma: PrismaClient) {
  await prisma.role.createMany({
    data: [
      { roleId: 1, roleName: "Superadmin", permissionId: 1 },
      { roleId: 2, roleName: "Dean", permissionId: 2 },
      { roleId: 3, roleName: "Professor", permissionId: 3 },
    ],
    skipDuplicates: true,
  });
}
