import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OrderRepository } from '../../repository/order.repository';
import { OrderStatus } from '../../../domain/order/enum/order-status.enum';

@Injectable()
export class ShipmentShippedProcessor {
  private readonly logger = new Logger(ShipmentShippedProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly orderRepository: OrderRepository,
    private readonly inboxRepository: InboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return ShipmentShippedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_ORDER!;

    this.logger.log(`Processing ShipmentShippedEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'ShipmentShippedEvent',
      },
      schema,
    );

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      this.logger.error(`Order not found for ID: ${orderId}`);
      return;
    }

    // Idempotent guard: event redelivery or legacy state should not error the consumer
    if (order.status === OrderStatus.SHIPPED) {
      this.logger.log(`Order ${orderId} already SHIPPED. Skipping.`);
      return;
    }

    order.ship();
    await this.orderRepository.save(order);

    this.logger.log(`Order ${orderId} status successfully updated to SHIPPED`);
  }
}
