import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface OrderPlacedEventPayload {
  orderId: string;
  customerId: string;
  totalPrice: number;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
}

export class OrderPlacedEvent implements DomainEvent<OrderPlacedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'OrderPlacedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: OrderPlacedEventPayload) {}
}
