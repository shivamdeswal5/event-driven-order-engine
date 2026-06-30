import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { OrderRepository } from '../../repository/order.repository';
import { OrderCancelledEvent } from '../../../domain/order/events/order-cancelled.event';

@Injectable()
export class InventoryReservationFailedProcessor {
  private readonly logger = new Logger(
    InventoryReservationFailedProcessor.name,
  );

  constructor(
    private readonly em: EntityManager,
    private readonly orderRepository: OrderRepository,
    private readonly inboxRepository: InboxMessageRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return InventoryReservationFailedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_ORDER!;

    this.logger.warn(
      `Processing InventoryReservationFailedEvent for order: ${orderId}`,
    );

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'InventoryReservationFailedEvent',
      },
      schema,
    );

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      this.logger.error(`Order not found for ID: ${orderId}`);
      return;
    }

    order.cancel('Inventory reservation failed');
    await this.orderRepository.save(order);

    const cancelledEvent = new OrderCancelledEvent({
      orderId: order.id,
      cancelReason: 'Inventory reservation failed',
    });
    await this.outboxRepository.storeOutboxMessage(cancelledEvent, { schema });

    this.logger.log(
      `Order ${orderId} successfully cancelled via InventoryReservationFailedEvent`,
    );
  }
}
