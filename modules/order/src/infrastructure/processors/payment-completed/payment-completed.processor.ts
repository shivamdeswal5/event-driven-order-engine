import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OrderRepository } from '../../repository/order.repository';

@Injectable()
export class PaymentCompletedProcessor {
  private readonly logger = new Logger(PaymentCompletedProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderRepository: OrderRepository,
    private readonly inboxRepository: InboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return PaymentCompletedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_ORDER!;

    this.logger.log(`Processing PaymentCompletedEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'PaymentCompletedEvent',
      },
      schema,
    );

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      this.logger.error(`Order not found for ID: ${orderId}`);
      return;
    }

    order.pay();
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderId} status successfully updated to PAID`);
  }
}
