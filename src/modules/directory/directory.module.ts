import { Module } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { DirectoryGateway } from './directory.gateway';
import { DirectoryService } from './directory.service';

@Module({
  controllers: [DirectoryController],
  providers: [DirectoryService, DirectoryGateway],
  exports: [DirectoryService],
})
export class DirectoryModule {}