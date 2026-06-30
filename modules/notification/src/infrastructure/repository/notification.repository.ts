import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Notification } from '../../domain/notification/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: EntityRepository<Notification>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Notification | null> {
    return await this.repository.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<Notification[]> {
    return await this.repository.find(
      { orderId },
      { orderBy: { createdAt: 'ASC' } },
    );
  }

  async findAll(filter?: { orderId?: string }): Promise<Notification[]> {
    const query: any = {};
    if (filter?.orderId) {
      query.orderId = filter.orderId;
    }
    return await this.repository.find(query, { orderBy: { createdAt: 'ASC' } });
  }

  async save(notification: Notification): Promise<void> {
    await this.em.persistAndFlush(notification);
  }
}
