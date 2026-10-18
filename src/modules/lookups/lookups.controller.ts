import { Controller, Get } from '@nestjs/common';
import { LookupsService } from './lookups.service';

@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get()
  getAllLookups() {
    return this.lookupsService.getAllLookups();
  }

  @Get('genders')
  getGenders() {
    return this.lookupsService.getGenders();
  }

  @Get('document-categories')
  getDocumentCategories() {
    return this.lookupsService.getDocumentCategories();
  }

  @Get('document-statuses')
  getDocumentStatuses() {
    return this.lookupsService.getDocumentStatuses();
  }
}