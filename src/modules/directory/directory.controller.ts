import { Controller, Get } from '@nestjs/common';
import { DirectoryService } from './directory.service';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('tree')
  getTree() {
    return this.directoryService.getSnapshot();
  }
}