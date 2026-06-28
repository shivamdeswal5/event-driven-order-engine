import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/order/order.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repository: EntityRepository<Order>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Order | null> {
    return await this.repository.findOne({ id });
  }

  async save(order: Order): Promise<void> {
    await this.em.persistAndFlush(order);
  }

  async remove(order: Order): Promise<void> {
    await this.em.removeAndFlush(order);
  }
}
