import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Payment } from '../../domain/payment/payment.entity';
import { PaymentStatus } from '../../domain/payment/enum/payment-status.enum';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repository: EntityRepository<Payment>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Payment | null> {
    return await this.repository.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return await this.repository.findOne({ orderId });
  }

  async findAll(filter?: { status?: PaymentStatus }): Promise<Payment[]> {
    const query: any = {};
    if (filter?.status) {
      query.status = filter.status;
    }
    return await this.repository.find(query, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async save(payment: Payment): Promise<void> {
    await this.em.persistAndFlush(payment);
  }

  async remove(payment: Payment): Promise<void> {
    await this.em.removeAndFlush(payment);
  }
}
