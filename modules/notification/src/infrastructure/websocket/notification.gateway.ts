import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToOrder')
  handleSubscribeToOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) {
      this.logger.warn(
        `Subscription attempt with invalid orderId from client: ${client.id}`,
      );
      client.emit('subscriptionError', { message: 'Invalid orderId payload.' });
      return;
    }

    const room = `order:${data.orderId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to room: ${room}`);
    client.emit('subscribed', { room, success: true });
  }

  broadcastToOrder(orderId: string, eventType: string, message: string) {
    const room = `order:${orderId}`;
    this.logger.log(`Broadcasting event ${eventType} to room: ${room}`);
    if (!this.server) {
      this.logger.warn(
        `WebSocket server is not initialized (CLI/standalone mode). Skipping real-time broadcast.`,
      );
      return;
    }
    this.server.to(room).emit('notification', {
      orderId,
      eventType,
      message,
      occurredAt: new Date(),
    });
  }
}
