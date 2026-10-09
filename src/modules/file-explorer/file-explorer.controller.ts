import { Controller, Get } from '@nestjs/common';
import { FileExplorerService } from './file-explorer.service';

@Controller('file-explorer')
export class FileExplorerController {
  constructor(private readonly files: FileExplorerService) {}
  @Get('tree') getTree() { return this.files.tree(); }
}
