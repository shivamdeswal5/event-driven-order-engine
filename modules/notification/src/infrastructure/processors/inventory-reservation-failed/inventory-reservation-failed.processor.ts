import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationBroadcaster } from '../../realtime/notification-broadcaster.service';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class InventoryReservationFailedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    broadcaster: NotificationBroadcaster,
  ) {
    super(em, inboxRepository, broadcaster);
  }

  getEventType(): string {
    return 'InventoryReservationFailedEvent';
  }

  getMessageText(payload: any): string {
    return `Failed to reserve items for order ${payload.orderId}. The order will be cancelled. Reason: ${payload.reason || 'Insufficient stock'}.`;
  }
}
