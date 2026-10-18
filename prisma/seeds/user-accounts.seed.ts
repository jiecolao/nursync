import { PrismaClient } from "@prisma/client";
// Optional: You can also hash dynamically using `bcrypt.hash("password123", 10)`

export async function seedUserAccounts(prisma: PrismaClient) {
  await prisma.userAccount.createMany({
    data: [
      {
        userAccId: "00000000-0000-7000-8000-000000000001",
        userId: "seed-user-001",
        username: "seed.admin",
        email: "jiecoandres.lao07@gmail.com",
        // Password for all seed users: password123
        hashedPass: "$2a$10$wT0o3q6/5qL5sQ1M8Vb6e.O5D5fJz9K9m.3E9v3Q8/5qL5sQ1M8Vb",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000002",
        userId: "seed-user-002",
        username: "seed.staff",
        email: "momonaticss96@gmail.com",
        hashedPass: "$2a$10$wT0o3q6/5qL5sQ1M8Vb6e.O5D5fJz9K9m.3E9v3Q8/5qL5sQ1M8Vb",
      },
      {
        userAccId: "00000000-0000-7000-8000-000000000003",
        userId: "seed-user-003",
        username: "seed.viewer",
        email: "seed.viewer@nursync.local",
        hashedPass: "$2a$10$wT0o3q6/5qL5sQ1M8Vb6e.O5D5fJz9K9m.3E9v3Q8/5qL5sQ1M8Vb",
      },
    ],
    skipDuplicates: true,
  });
}