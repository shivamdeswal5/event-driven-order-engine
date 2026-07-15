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
import { NotificationBroadcaster } from '../realtime/notification-broadcaster.service';

/**
 * NotificationGateway — INBOUND WebSocket edge only.
 *
 * Runs inside the HTTP app. It accepts client connections on the
 * `/notifications` namespace and:
 *  - auto-joins every client to the `saga:firehose` observability room so the
 *    console receives the complete saga stream with no join race, and
 *  - lets a client additionally join a specific order room via
 *    `subscribeToOrder` for targeted, order-scoped events.
 *
 * It does NOT broadcast: outbound fan-out is handled by
 * `NotificationBroadcaster` -> the RealtimeBroadcaster port (Redis backplane),
 * so events originating in a separate consumer process still reach clients.
 */
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
    client.join(NotificationBroadcaster.FIREHOSE_ROOM);
    this.logger.log(
      `Client connected: ${client.id} (joined ${NotificationBroadcaster.FIREHOSE_ROOM})`,
    );
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
}
