import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/order/order.entity';
import { PlaceOrderCommand } from './place-order.command';
import { OrderPlacedEvent } from '../../domain/order/events/order-placed.event';
import { OrderRepository } from '../../infrastructure/repository/order.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { Transactional } from '@mikro-orm/core';

@Injectable()
export class PlaceOrderHandler {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  @Transactional()
  async handle(command: PlaceOrderCommand): Promise<void> {
    // 1. Calculate total price
    const totalPrice = command.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    // 2. Create the Order entity
    const order = new Order();
    order.customerId = command.customerId;
    order.totalPrice = totalPrice;

    // Transition status from PENDING to PLACED
    order.place();

    // 3. Create the Outbox message
    const orderPlacedEvent = new OrderPlacedEvent({
      orderId: order.id,
      customerId: order.customerId,
      totalPrice: order.totalPrice,
      items: command.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    await this.orderRepository.save(order);

    await this.outboxRepository.storeOutboxMessage(orderPlacedEvent, {
      schema: process.env.DB_SCHEMA_ORDER,
    });
  }
}
