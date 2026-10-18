import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';

const genderSelect = {
  genderId: true,
  genderName: true,
} as const;

const documentCategorySelect = {
  docuId: true,
  docuName: true,
} as const;

const documentStatusSelect = {
  docuStatusId: true,
  docuStatusName: true,
} as const;

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLookups() {
    const [genders, documentCategories, documentStatuses] = await Promise.all([
      this.getGenders(),
      this.getDocumentCategories(),
      this.getDocumentStatuses(),
    ]);

    return {
      genders,
      documentCategories,
      documentStatuses,
    };
  }

  getGenders() {
    return this.prisma.gender.findMany({
      where: { status: true },
      select: genderSelect,
      orderBy: { genderId: 'asc' },
    });
  }

  getDocumentCategories() {
    return this.prisma.documentCategories.findMany({
      where: { status: true },
      select: documentCategorySelect,
      orderBy: { docuId: 'asc' },
    });
  }

  getDocumentStatuses() {
    return this.prisma.documentStatus.findMany({
      select: documentStatusSelect,
      orderBy: { docuStatusId: 'asc' },
    });
  }
}