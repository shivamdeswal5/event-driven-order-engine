import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InboxMessage } from '@shared/domain/inbox/inbox-message.entity';

export interface InboxMessagePayload {
  messageId: string;
  handlerName: string;
  eventType: string;
}

@Injectable()
export class InboxMessageRepository extends EntityRepository<InboxMessage> {
  constructor(em: EntityManager) {
    super(em, InboxMessage);
  }
  async storeInboxMessage(
    payload: InboxMessagePayload,
    schema?: string,
  ): Promise<InboxMessage> {
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
