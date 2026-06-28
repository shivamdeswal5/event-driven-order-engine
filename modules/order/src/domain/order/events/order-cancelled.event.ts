import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface OrderCancelledEventPayload {
  orderId: string;
  cancelReason: string;
}

export class OrderCancelledEvent implements DomainEvent<OrderCancelledEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'OrderCancelledEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: OrderCancelledEventPayload) {}
}
