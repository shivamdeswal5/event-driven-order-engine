import { EntityRepository } from '@mikro-orm/postgresql';
import { OutboxMessage } from '../../outbox/outbox-message.entity';

export class OutboxMessageRepository extends EntityRepository<OutboxMessage> {
  async save(outboxMessage: OutboxMessage): Promise<void> {
    await this.em.persistAndFlush(outboxMessage);
  }
}
