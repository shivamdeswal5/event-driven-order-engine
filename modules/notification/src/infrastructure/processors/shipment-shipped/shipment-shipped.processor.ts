import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationBroadcaster } from '../../realtime/notification-broadcaster.service';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class ShipmentShippedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    broadcaster: NotificationBroadcaster,
  ) {
    super(em, inboxRepository, broadcaster);
  }

  getEventType(): string {
    return 'ShipmentShippedEvent';
  }

  getMessageText(payload: any): string {
    return `Shipment ${payload.shipmentId} for order ${payload.orderId} has been dispatched via ${payload.carrier} (tracking ${payload.trackingNumber}).`;
  }
}
