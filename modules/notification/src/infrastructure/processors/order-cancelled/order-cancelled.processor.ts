import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationGateway } from '../../websocket/notification.gateway';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class OrderCancelledProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    gateway: NotificationGateway,
  ) {
    super(em, inboxRepository, gateway);
  }

  getEventType(): string {
    return 'OrderCancelledEvent';
  }

  getMessageText(payload: any): string {
    return `Order ${payload.orderId} has been cancelled. Reason: ${payload.reason || 'Saga failed/Manually cancelled'}.`;
  }
}
