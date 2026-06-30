import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface ShipmentCreatedEventPayload {
  orderId: string;
  shipmentId: string;
}

export class ShipmentCreatedEvent implements DomainEvent<ShipmentCreatedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'ShipmentCreatedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: ShipmentCreatedEventPayload) {}
}
