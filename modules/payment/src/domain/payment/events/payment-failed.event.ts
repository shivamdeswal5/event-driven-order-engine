import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface PaymentFailedEventPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  reason: string;
}

export class PaymentFailedEvent implements DomainEvent<PaymentFailedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'PaymentFailedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: PaymentFailedEventPayload) {}
}
