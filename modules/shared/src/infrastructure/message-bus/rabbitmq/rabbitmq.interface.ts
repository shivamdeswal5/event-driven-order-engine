import * as RabbitMQ from 'amqplib';

export interface ConfigType {
  username?: string;
  password?: string;
  appName: string;
  heartbeatInterval?: number;
  dsn: string;
  primaryQueueExchange?: string;
  primaryQueueExchangeType?: string;
  primaryQueue?: string;
  primaryQueueBindingKey?: string;
  retryQueueExchange?: string;
  retryQueueExchangeType?: string;
  retryQueue?: string;
  retryQueueBindingKey?: string;
  errorQueueRoutingKey?: string;
  errorQueueExchange?: string;
  errorQueueExchangeType?: string;
  errorQueue?: string;
  delayedRetriesNumber: number;
  immediateRetriesNumber: number;
  retryQueueMessageTtl: number;
  consumeMessageLimit: number;
  dispatchMessageLimit: number;
}

export interface RabbitMQPublishMessage {
  exchange: string;
  bindingKey: string;
  content: string;
  properties: RabbitMQ.Options.Publish;
}

export interface QueueConfig {
  durable: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
}

export interface RuntimeConfigOverrides {
  schema?: string;
  primaryQueue?: string;
  primaryQueueBindingKey?: string;
  primaryQueueExchange?: string;
  primaryQueueExchangeType?: string;
  retryQueue?: string;
  retryQueueBindingKey?: string;
  retryQueueExchange?: string;
  retryQueueExchangeType?: string;
  retryQueueMessageTtl?: number;
  immediateRetriesNumber?: number;
  delayedRetriesNumber?: number;
  errorQueueExchange?: string;
  errorQueueExchangeType?: string;
  errorQueueRoutingKey?: string;
  errorQueue?: string;
  appName?: string;
}

export interface ConsumerOptions extends RuntimeConfigOverrides {
  limit?: number;
}

export interface ExchangeConfig {
  name: string;
  type: string;
}

export interface MessageObject {
  messageId: string;
  body: any;
}
