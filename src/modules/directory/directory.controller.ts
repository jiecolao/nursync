import { Controller, Get, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('tree')
  getTree(@Query('scope') scope?: string) {
    return this.directoryService.getSnapshot(this.directoryService.resolveScope(scope));
  }
}