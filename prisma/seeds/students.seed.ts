import { PrismaClient } from "@prisma/client";

export async function seedStudents(prisma: PrismaClient) {
  await prisma.student.createMany({
    data: [
      {
        studentUuid: "00000000-0000-7000-8000-000000000101",
        studentId: "2024-0001",
        lastName: "Garcia",
        firstName: "Ana",
        middleName: "Lopez",
        genderId: 2,
        dob: new Date("2005-04-12"),
        contactNo: "09171234567",
        email: "ana.garcia@example.com",
        provincialAddr: "Cebu City",
        cityAddr: "Manila",
        yrAdmitted: 2024,
        yrResidency: 1,
      },
      {
        studentUuid: "00000000-0000-7000-8000-000000000102",
        studentId: "2023-0002",
        lastName: "Dela Cruz",
        firstName: "Ben",
        middleName: "Santos",
        genderId: 1,
        dob: new Date("2004-09-23"),
        contactNo: "09181234567",
        email: "ben.delacruz@example.com",
        provincialAddr: "Davao City",
        cityAddr: "Manila",
        yrAdmitted: 2023,
        yrResidency: 2,
      },
      {
        studentUuid: "00000000-0000-7000-8000-000000000103",
        studentId: "2022-0003",
        lastName: "Tan",
        firstName: "Casey",
        middleName: "Lim",
        genderId: 3,
        dob: new Date("2003-01-08"),
        contactNo: "09191234567",
        email: "casey.tan@example.com",
        provincialAddr: "Iloilo City",
        cityAddr: "Manila",
        yrAdmitted: 2022,
        yrResidency: 3,
      },
    ],
    skipDuplicates: true,
  });
}
