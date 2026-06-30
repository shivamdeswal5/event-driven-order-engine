import { Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { Notification } from '../../domain/notification/notification.entity';
import { NotificationGateway } from '../websocket/notification.gateway';

export abstract class BaseNotificationProcessor {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly em: EntityManager,
    protected readonly inboxRepository: InboxMessageRepository,
    protected readonly gateway: NotificationGateway,
  ) {}

  abstract getEventType(): string;
  abstract getMessageText(payload: any): string;

  getHandlerName(): string {
    return this.constructor.name;
  }

  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;

    if (!orderId) {
      this.logger.error(`Received message without orderId. Skipping.`);
      return;
    }

    const eventType = this.getEventType();
    const messageText = this.getMessageText(payload);

    this.logger.log(`Processing event ${eventType} for order: ${orderId}`);

    // Perform database operations inside transaction
    await this.persistNotification(
      message.messageId,
      orderId,
      eventType,
      messageText,
    );

    // Broadcast only after the database transaction successfully completed/committed
    try {
      this.gateway.broadcastToOrder(orderId, eventType, messageText);
    } catch (err) {
      this.logger.error(
        `Failed to broadcast to order ${orderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @Transactional()
  protected async persistNotification(
    messageId: string,
    orderId: string,
    eventType: string,
    messageText: string,
  ): Promise<void> {
    const schema = process.env.DB_SCHEMA_NOTIFICATION!;

    // Deduplicate / Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId,
        handlerName: this.getHandlerName(),
        eventType,
      },
      schema,
    );

    // Save notification log
    const notification = new Notification();
    notification.orderId = orderId;
    notification.eventType = eventType;
    notification.message = messageText;

    await this.em.persistAndFlush(notification);
  }
}
