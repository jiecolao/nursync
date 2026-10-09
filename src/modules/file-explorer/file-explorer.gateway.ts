import { OnModuleDestroy } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { FileExplorerService } from './file-explorer.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true } })
export class FileExplorerGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private subscription?: Subscription;
  constructor(private readonly files: FileExplorerService) {}
  afterInit() { this.subscription = this.files.events.subscribe((event) => this.server.emit('filesystem:event', event)); }
  async handleConnection(client: Socket) {
    try { client.emit('filesystem:initial', await this.files.tree()); }
    catch { client.emit('filesystem:error', { message: 'Unable to read the watched directory.' }); }
  }
  onModuleDestroy() { this.subscription?.unsubscribe(); }
}
