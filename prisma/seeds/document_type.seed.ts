import { PrismaClient } from "@prisma/client";

export async function seedDocumentCategories (prisma: PrismaClient) {

    await prisma.documentCategories.createMany({
        data: [
            { docuId: 1, docuName: "Personal Records" },
            { docuId: 2, docuName: "Academic Records" },
            { docuId: 3, docuName: "RLE / Clinical Records" },
            { docuId: 4, docuName: "Completion and Certification Records" },
            { docuId: 5, docuName: "Others" },
        ],
        skipDuplicates: true,
    });

}
