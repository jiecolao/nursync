import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DirectoryService } from './directory.service';
import { DirectoryEvent } from './directory.types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  },
})
export class DirectoryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(DirectoryGateway.name);

  constructor(private readonly directoryService: DirectoryService) {}

  afterInit() {
    this.directoryService.setEventHandler((event: DirectoryEvent) => {
      this.server.emit('directory:event', event);
    });
  }

  async handleConnection(client: Socket) {
    try {
      client.emit('directory:snapshot', await this.directoryService.getSnapshot());
    } catch (error) {
      client.emit('directory:error', {
        message: error instanceof Error ? error.message : 'Unable to read directory',
      });
      this.logger.warn('Unable to send initial directory snapshot');
    }
  }

  handleDisconnect(_client: Socket) {}
}