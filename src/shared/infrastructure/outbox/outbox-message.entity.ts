import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'outbox_messages' })
export class OutboxMessage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

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

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
