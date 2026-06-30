export interface IRabbitMqConfig {
  appName?: string;
  // Primary queue related configurations
  primaryQueue?: string;
  primaryQueueBindingKey?: string;
  primaryQueueExchange?: string;
  primaryQueueExchangeType?: string;

  // Retry mechanism related configurations
  retryQueue?: string;
  retryQueueBindingKey?: string;
  retryQueueExchange?: string;
  retryQueueExchangeType?: string;

  // Error queue related configurations
  errorQueueRoutingKey?: string;
  errorQueueExchange?: string;
  errorQueueExchangeType?: string;
  errorQueue?: string;

  delayedRetriesNumber?: number;
  immediateRetriesNumber?: number;
  retryQueueMessageTtl?: number;
  consumeMessageLimit?: number;
  dispatchMessageLimit?: number;
}

export const RABBITMQ_CONFIG = 'RABBITMQ_CONFIG';
