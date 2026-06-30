import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface ShipmentDeliveredEventPayload {
  orderId: string;
  shipmentId: string;
  deliveredAt: Date;
}

export class ShipmentDeliveredEvent implements DomainEvent<ShipmentDeliveredEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'ShipmentDeliveredEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: ShipmentDeliveredEventPayload) {}
}
