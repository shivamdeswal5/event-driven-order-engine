import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';

@Entity({
  tableName: 'notifications',
  schema: process.env.DB_SCHEMA_NOTIFICATION,
})
export class Notification extends BaseEntity {
  @Property({ type: 'uuid' })
  orderId!: string;

  @Property({ type: 'varchar(255)' })
  eventType!: string;

  @Property({ type: 'text' })
  message!: string;
}
