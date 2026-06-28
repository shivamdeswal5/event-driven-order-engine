import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../../domain/order/order.entity';
import { ListOrdersQuery } from './list-orders.query';

@Injectable()
export class ListOrdersHandler {
  constructor(private readonly em: EntityManager) {}

  async handle(query: ListOrdersQuery): Promise<{ items: Order[]; total: number }> {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.em.findAndCount(
      Order,
      where,
      {
        limit: query.limit,
        offset: query.offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { items, total };
  }
}
