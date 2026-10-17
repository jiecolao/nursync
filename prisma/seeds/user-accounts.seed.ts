import { PrismaClient } from "@prisma/client";

export async function seedUserAccounts(prisma: PrismaClient) {
  await prisma.userAccount.createMany({
    data: [
      {
        userAccId: "00000000-0000-7000-8000-000000000001",
        userId: "seed-user-001",
        username: "seed.admin",
        email: "seed.admin@nursync.local",
        hashedPass: "$2b$10$7EqJtq98hPqEX7fNZaFWoO5Yx8K8bQ5vQfQ5aXJdWn5m8QfQ5aXJu",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000002",
        userId: "seed-user-002",
        username: "seed.staff",
        email: "seed.staff@nursync.local",
        hashedPass: "$2b$10$7EqJtq98hPqEX7fNZaFWoO5Yx8K8bQ5vQfQ5aXJdWn5m8QfQ5aXJu",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000003",
        userId: "seed-user-003",
        username: "seed.viewer",
        email: "seed.viewer@nursync.local",
        hashedPass: "$2b$10$7EqJtq98hPqEX7fNZaFWoO5Yx8K8bQ5vQfQ5aXJdWn5m8QfQ5aXJu",
      },
    ],
    skipDuplicates: true,
  });
}
