import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface ShipmentShippedEventPayload {
  orderId: string;
  shipmentId: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: Date;
}

export class ShipmentShippedEvent implements DomainEvent<ShipmentShippedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'ShipmentShippedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: ShipmentShippedEventPayload) {}
}
