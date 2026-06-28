export interface DomainEvent<TPayload = any> {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  payload: TPayload;
}
