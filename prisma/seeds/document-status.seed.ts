import { PrismaClient } from "@prisma/client";

export async function seedDocumentStatus(prisma: PrismaClient) {
  await prisma.documentStatus.createMany({
    data: [
      { docuStatusId: 1, docuStatusName: "Pending" },
      { docuStatusId: 2, docuStatusName: "Approved" },
      { docuStatusId: 3, docuStatusName: "Rejected" },
    ],
    skipDuplicates: true,
  });
}
