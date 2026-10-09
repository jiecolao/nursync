import { Module } from '@nestjs/common';
import { FileExplorerController } from './file-explorer.controller';
import { FileExplorerGateway } from './file-explorer.gateway';
import { FileExplorerService } from './file-explorer.service';

@Module({ controllers: [FileExplorerController], providers: [FileExplorerService, FileExplorerGateway], exports: [FileExplorerService] })
export class FileExplorerModule {}
