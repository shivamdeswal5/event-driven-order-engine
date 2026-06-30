import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Notification } from '../../domain/notification/notification.entity';
import { ListNotificationsQuery } from './list-notifications.query';

@Injectable()
export class ListNotificationsHandler {
  constructor(private readonly em: EntityManager) {}

  async handle(
    query: ListNotificationsQuery,
  ): Promise<{ items: Notification[]; total: number }> {
    const where: any = {};
    if (query.orderId) {
      where.orderId = query.orderId;
    }

    const [items, total] = await this.em.findAndCount(Notification, where, {
      limit: query.limit,
      offset: query.offset,
      orderBy: { createdAt: 'ASC' }, // ascending so timeline reads top-to-bottom
    });

    return { items, total };
  }
}
