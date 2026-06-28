export interface MessageEnvelope<TPayload = any> {
  messageId: string;        // Unique identifier (used for inbox deduplication)
  correlationId: string;    // Traces the entire flow (saga execution path)
  causationId?: string;     // The message that directly triggered this one
  type: string;             // Message type / event type (e.g., 'OrderPlaced')
  source: string;           // Supplying module (e.g., 'order-module')
  occurredAt: Date;         // When the event occurred
  payload: TPayload;        // The actual payload data
  metadata: {
    version: number;        // Schema version for the message structure
    retryCount: number;     // Tracks current retry attempts in RabbitMQ
  };
}
