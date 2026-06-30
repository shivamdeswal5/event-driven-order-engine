import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { NotificationGateway } from '../../websocket/notification.gateway';
import { BaseNotificationProcessor } from '../base-notification.processor';

@Injectable()
export class ShipmentCreatedProcessor extends BaseNotificationProcessor {
  constructor(
    em: EntityManager,
    inboxRepository: InboxMessageRepository,
    gateway: NotificationGateway,
  ) {
    super(em, inboxRepository, gateway);
  }

  getEventType(): string {
    return 'ShipmentCreatedEvent';
  }

  getMessageText(payload: any): string {
    return `Shipment initialized for order ${payload.orderId}. Shipment ID: ${payload.shipmentId}.`;
  }
}
