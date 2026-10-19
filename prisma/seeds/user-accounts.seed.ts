import { PrismaClient } from "@prisma/client";
// Optional: You can also hash dynamically using `bcrypt.hash("password123", 10)`

export async function seedUserAccounts(prisma: PrismaClient) {
  await prisma.userAccount.createMany({
    data: [
      {
        userAccId: "00000-00000",
        userId: "superadmin-001",
        username: "Superadmin",
        email: "plmcnstudentrecords11.18@gmail.com",
        hashedPass: "$argon2id$v=19$m=65536,p=4,t=3$uuCoYvDLmgePDpNnvxrE9w$S1vZMAvM/8UnDaGlQmP8ZPUn6Bo6/TK8MSj/BF+0Lxw",
      },
    ],
    skipDuplicates: true,
  });
}