import { EntityRepository } from '@mikro-orm/postgresql';
import { InboxMessage } from '../../inbox/inbox-message.entity';

export interface InboxMessagePayload {
  messageId: string;
  handlerName: string;
  eventType: string;
}

export class InboxMessageRepository extends EntityRepository<InboxMessage> {
  async storeInboxMessage(payload: InboxMessagePayload, schema?: string): Promise<InboxMessage> {
    const entity = this.em.create(InboxMessage, payload, { schema });
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async getInboxMessageById(
    messageId: string,
    handlerName: string,
    schema?: string,
  ): Promise<InboxMessage | null> {
    return await this.findOne({ messageId, handlerName }, { schema });
  }
}
