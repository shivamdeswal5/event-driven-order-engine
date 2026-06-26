import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { InboxMessageRepository } from '../repository/inbox/inbox-message.repository';

@Entity({ tableName: 'inbox_messages', repository: () => InboxMessageRepository })
@Unique({ name: 'uq_inbox_message_handler', properties: ['messageId', 'handlerName'] })
export class InboxMessage extends BaseEntity {
  @Property({ type: 'uuid' })
  messageId!: string;

  @Property()
  handlerName!: string;

  @Property()
  eventType!: string;
}
