import { randomUUID } from 'crypto';
import { DomainEvent } from '@shared/domain/common/domain-event.interface';

export interface InventoryReservedEventPayload {
  orderId: string;
  totalPrice: number;
  items: Array<{ productId: string; quantity: number }>;
}

export class InventoryReservedEvent implements DomainEvent<InventoryReservedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'InventoryReservedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: InventoryReservedEventPayload) {}
}
