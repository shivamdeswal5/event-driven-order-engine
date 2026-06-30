import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Payment } from '../../domain/payment/payment.entity';
import { ListPaymentsQuery } from './list-payments.query';

@Injectable()
export class ListPaymentsHandler {
  constructor(private readonly em: EntityManager) {}

  async handle(
    query: ListPaymentsQuery,
  ): Promise<{ items: Payment[]; total: number }> {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.em.findAndCount(Payment, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy: { createdAt: 'DESC' },
    });

    return { items, total };
  }
}
