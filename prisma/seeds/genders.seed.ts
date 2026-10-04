import { PrismaClient } from "@prisma/client";

export async function seedGender(prisma: PrismaClient) {

	await prisma.gender.createMany({
		data: [
			{ genderId: 1, genderName: "Male" },
			{ genderId: 2, genderName: "Female" },
			{ genderId: 3, genderName: "Prefer not to say" },
		],
		skipDuplicates: true,
	});

}
