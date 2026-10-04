import { PrismaClient } from "@prisma/client";

export async function seedStudentDocuments(prisma: PrismaClient) {
  await prisma.studentDocument.createMany({
    data: [
      {
        studentDocId: "seed-student-doc-001",
        studentUuid: "00000000-0000-7000-8000-000000000101",
        docuId: 1,
        filename: "ana-personal-records.pdf",
        filepath: "seed/ana-personal-records.pdf",
        submittedAt: new Date("2024-06-10"),
        docuStatusId: 2,
      },
      {
        studentDocId: "seed-student-doc-002",
        studentUuid: "00000000-0000-7000-8000-000000000102",
        docuId: 2,
        filename: "ben-academic-records.pdf",
        filepath: "seed/ben-academic-records.pdf",
        submittedAt: new Date("2024-06-11"),
        docuStatusId: 1,
      },
      {
        studentDocId: "seed-student-doc-003",
        studentUuid: "00000000-0000-7000-8000-000000000103",
        docuId: 3,
        filename: "casey-clinical-records.pdf",
        filepath: "seed/casey-clinical-records.pdf",
        submittedAt: new Date("2024-06-12"),
        docuStatusId: 3,
      },
    ],
    skipDuplicates: true,
  });
}
