import { DomainEvent } from '@shared/domain/common/domain-event.interface';
import { randomUUID } from 'crypto';

export interface PaymentCompletedEventPayload {
  orderId: string;
  paymentId: string;
  amount: number;
}

export class PaymentCompletedEvent implements DomainEvent<PaymentCompletedEventPayload> {
  public readonly eventId: string = randomUUID();
  public readonly eventType: string = 'PaymentCompletedEvent';
  public readonly occurredAt: Date = new Date();

  constructor(public readonly payload: PaymentCompletedEventPayload) {}
}
