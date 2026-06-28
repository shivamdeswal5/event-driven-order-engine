import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/order/order.entity';
import { CancelOrderCommand } from './cancel-order.command';
import { OrderCancelledEvent } from '../../domain/order/events/order-cancelled.event';
import { OrderRepository } from '../../infrastructure/repository/order.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { OrderNotFoundException } from '../../domain/order/exceptions/order.exceptions';
import { Transactional } from '@mikro-orm/core';

@Injectable()
export class CancelOrderHandler {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  @Transactional()
  async handle(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      throw new OrderNotFoundException(command.orderId);
    }

    order.cancel(command.reason);

    const event = new OrderCancelledEvent({
      orderId: order.id,
      cancelReason: command.reason,
    });

    await this.orderRepository.save(order);

    await this.outboxRepository.storeOutboxMessage(event, {
      schema: process.env.DB_SCHEMA_ORDER,
    });
  }
}
