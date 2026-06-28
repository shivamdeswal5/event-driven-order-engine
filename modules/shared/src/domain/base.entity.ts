import { PrimaryKey, Property, OptionalProps } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export abstract class BaseEntity {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
