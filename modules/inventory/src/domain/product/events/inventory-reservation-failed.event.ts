import { randomUUID } from 'crypto';
import { DomainEvent } from '@shared/domain/common/domain-event.interface';

export interface InventoryReservationFailedEventPayload {
  orderId: string;
  reason: string;
}

export class InventoryReservationFailedEvent implements DomainEvent<InventoryReservationFailedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'InventoryReservationFailedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly payload: InventoryReservationFailedEventPayload,
  ) {}
}
