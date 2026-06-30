import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationGateway } from '../../websocket/notification.gateway';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class PaymentCompletedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    gateway: NotificationGateway,
  ) {
    super(em, inboxRepository, gateway);
  }

  getEventType(): string {
    return 'PaymentCompletedEvent';
  }

  getMessageText(payload: any): string {
    return `Payment for order ${payload.orderId} processed successfully. Amount: $${payload.amount}.`;
  }
}
