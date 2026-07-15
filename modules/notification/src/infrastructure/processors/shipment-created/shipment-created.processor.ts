import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationBroadcaster } from '../../realtime/notification-broadcaster.service';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class ShipmentCreatedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    broadcaster: NotificationBroadcaster,
  ) {
    super(em, inboxRepository, broadcaster);
  }

  getEventType(): string {
    return 'ShipmentCreatedEvent';
  }

  getMessageText(payload: any): string {
    return `Shipment initialized for order ${payload.orderId}. Shipment ID: ${payload.shipmentId}.`;
  }
}
