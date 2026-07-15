import { Inject, Injectable } from '@nestjs/common';
import {
  REALTIME_BROADCASTER,
  RealtimeBroadcaster,
} from '@shared/infrastructure/realtime/realtime-broadcaster.interface';

/**
 * NotificationBroadcaster
 *
 * Owns the notification module's realtime CONTRACT with the frontend. Every
 * saga event is fanned out on TWO channels over the same Redis backplane:
 *
 *  1. Targeted delivery (production pattern)
 *     - room  `order:<orderId>` · event `notification`
 *     - only clients that subscribed to that order receive it (e.g. toasts for
 *       "my order").
 *
 *  2. Observability firehose (ops console)
 *     - room  `saga:firehose` · event `saga-event`
 *     - every connected console receives the COMPLETE saga stream regardless of
 *       which orders it subscribed to. Clients join this room automatically on
 *       connect (see NotificationGateway.handleConnection), so there is no
 *       join-vs-first-event race and no dropped hops in the topology view.
 *
 * Both share the payload `{ orderId, eventType, message, occurredAt }`.
 *
 * It delegates the actual cross-process delivery to the generic
 * {@link RealtimeBroadcaster} port, so this module has zero knowledge of Redis
 * or Socket.io internals. This keeps transport concerns in `shared/` and
 * domain/presentation concerns here in the notification module.
 */
@Injectable()
export class NotificationBroadcaster {
  static readonly NAMESPACE = '/notifications';
  static readonly FIREHOSE_ROOM = 'saga:firehose';
  private static readonly EVENT = 'notification';
  private static readonly FIREHOSE_EVENT = 'saga-event';

  constructor(
    @Inject(REALTIME_BROADCASTER)
    private readonly broadcaster: RealtimeBroadcaster,
  ) {}

  broadcastToOrder(orderId: string, eventType: string, message: string): void {
    const payload = {
      orderId,
      eventType,
      message,
      occurredAt: new Date(),
    };

    // 1. Targeted delivery — only clients subscribed to this order's room.
    this.broadcaster.broadcastToRoom(
      NotificationBroadcaster.NAMESPACE,
      `order:${orderId}`,
      NotificationBroadcaster.EVENT,
      payload,
    );

    // 2. Observability fan-out — every console watching the firehose sees the
    //    full saga stream, so the topology never misses a hop.
    this.broadcaster.broadcastToRoom(
      NotificationBroadcaster.NAMESPACE,
      NotificationBroadcaster.FIREHOSE_ROOM,
      NotificationBroadcaster.FIREHOSE_EVENT,
      payload,
    );
  }
}
