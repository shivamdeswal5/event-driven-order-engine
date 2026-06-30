import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Shipment } from '../../domain/shipment/shipment.entity';
import { ListShipmentsQuery } from './list-shipments.query';

@Injectable()
export class ListShipmentsHandler {
  constructor(private readonly em: EntityManager) {}

  async handle(
    query: ListShipmentsQuery,
  ): Promise<{ items: Shipment[]; total: number }> {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.em.findAndCount(Shipment, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy: { createdAt: 'DESC' },
    });

    return { items, total };
  }
}
