import { randomUUID } from 'crypto';
import { DomainEvent } from '@shared/domain/common/domain-event.interface';

export interface InventoryReleasedEventPayload {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export class InventoryReleasedEvent implements DomainEvent<InventoryReleasedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'InventoryReleasedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: InventoryReleasedEventPayload) {}
}
