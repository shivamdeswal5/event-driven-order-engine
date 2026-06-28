import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../../domain/order/order.entity';
import { GetOrderQuery } from './get-order.query';
import { OrderNotFoundException } from '../../domain/order/exceptions/order.exceptions';

@Injectable()
export class GetOrderHandler {
  constructor(private readonly em: EntityManager) {}

  async handle(query: GetOrderQuery): Promise<Order> {
    const order = await this.em.findOne(Order, { id: query.orderId });
    if (!order) {
      throw new OrderNotFoundException(query.orderId);
    }
    return order;
  }
}
