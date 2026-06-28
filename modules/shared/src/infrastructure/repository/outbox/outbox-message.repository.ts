import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { OutboxMessage } from '@shared/domain/outbox/outbox-message.entity';
import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { randomUUID } from 'crypto';

@Injectable()
export class OutboxMessageRepository extends EntityRepository<OutboxMessage> {
  constructor(
    em: EntityManager,
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {
    super(em, OutboxMessage);
  }

  async save(outboxMessage: OutboxMessage): Promise<void> {
    await this.em.persistAndFlush(outboxMessage);
  }

  async storeOutboxMessage(
    event: DomainEvent,
    options?: { schema?: string; correlationId?: string; causationId?: string },
  ): Promise<OutboxMessage> {
    const destination = this.messageDestinationRegistry.get(event.eventType);
    if (!destination) {
      throw new Error(`No destination registered for event type: ${event.eventType}`);
    }

    const outboxMessage = this.create({
      id: event.eventId || randomUUID(),
      eventType: event.eventType,
      payload: event.payload,
      exchange: destination.exchange,
      routingKey: destination.routingKey,
      correlationId: options?.correlationId || event.eventId || randomUUID(),
      causationId: options?.causationId,
      processed: false,
    }, { schema: options?.schema });

    await this.save(outboxMessage);
    return outboxMessage;
  }
}
