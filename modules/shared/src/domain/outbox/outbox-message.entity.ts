import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';

@Entity({ tableName: 'outbox_messages', repository: () => OutboxMessageRepository })
export class OutboxMessage extends BaseEntity {
  @Property()
  eventType!: string;

  @Property({ type: 'json' })
  payload!: any;

  @Property()
  exchange!: string;

  @Property()
  routingKey!: string;

  @Property()
  correlationId!: string;

  @Property({ nullable: true })
  causationId?: string;

  @Property({ default: false })
  processed: boolean = false;

  @Property({ nullable: true })
  processedAt?: Date;
}
