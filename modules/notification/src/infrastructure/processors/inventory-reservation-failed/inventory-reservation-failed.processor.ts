import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationGateway } from '../../websocket/notification.gateway';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class InventoryReservationFailedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    gateway: NotificationGateway,
  ) {
    super(em, inboxRepository, gateway);
  }

  getEventType(): string {
    return 'InventoryReservationFailedEvent';
  }

  getMessageText(payload: any): string {
    return `Failed to reserve items for order ${payload.orderId}. The order will be cancelled. Reason: ${payload.reason || 'Insufficient stock'}.`;
  }
}
