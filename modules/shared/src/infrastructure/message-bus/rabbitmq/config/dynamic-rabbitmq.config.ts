import { Injectable, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRabbitMqConfig } from './rabbitmq-config.interface';

export function createDynamicRabbitMqConfig(
  moduleName: string,
): Type<IRabbitMqConfig> {
  const upper = moduleName.toUpperCase();

  @Injectable()
  class DynamicRabbitMqConfig implements IRabbitMqConfig {
    constructor(private configService: ConfigService) {}

    get appName(): string {
      return (
        this.configService.get<string>(`RABBITMQ_${upper}_APP_NAME`) ||
        `event-driven-order-engine-${moduleName}`
      );
    }

    get primaryQueue(): string {
      return (
        this.configService.get<string>(`RABBITMQ_${upper}_EVENTS_QUEUE`) ||
        `${moduleName}-queue`
      );
    }

    get primaryQueueBindingKey(): string {
      return (
        this.configService.get<string>(
          `RABBITMQ_${upper}_EVENTS_QUEUE_BINDING_KEY`,
        ) || `${moduleName}.*`
      );
    }

    get primaryQueueExchange(): string {
      return (
        this.configService.get<string>('RABBITMQ_TOPIC_EXCHANGE') ||
        `${moduleName}-exchange`
      );
    }

    get primaryQueueExchangeType(): string {
      return (
        this.configService.get<string>('RABBITMQ_TOPIC_EXCHANGE_TYPE') ||
        'topic'
      );
    }

    get retryQueue(): string {
      return (
        this.configService.get<string>(
          `RABBITMQ_${upper}_EVENTS_RETRY_QUEUE`,
        ) || `${moduleName}-retry-queue`
      );
    }

    get retryQueueBindingKey(): string {
      return (
        this.configService.get<string>(
          `RABBITMQ_${upper}_EVENTS_RETRY_QUEUE_BINDING_KEY`,
        ) || `${moduleName}-retry-routing-key`
      );
    }

    get retryQueueExchange(): string {
      return (
        this.configService.get<string>('RABBITMQ_DIRECT_EXCHANGE') ||
        `${moduleName}-retry-exchange`
      );
    }

    get retryQueueExchangeType(): string {
      return (
        this.configService.get<string>('RABBITMQ_DIRECT_EXCHANGE_TYPE') ||
        'direct'
      );
    }

    get errorQueueRoutingKey(): string {
      return (
        this.configService.get<string>('RABBITMQ_ERROR_QUEUE_ROUTING_KEY') ||
        `${moduleName}.error`
      );
    }

    get errorQueue(): string {
      return (
        this.configService.get<string>(
          `RABBITMQ_${upper}_EVENTS_ERROR_QUEUE`,
        ) || `${moduleName}-error-queue`
      );
    }

    get errorQueueExchange(): string {
      return (
        this.configService.get<string>('RABBITMQ_DIRECT_EXCHANGE') ||
        `${moduleName}-retry-exchange`
      );
    }

    get errorQueueExchangeType(): string {
      return (
        this.configService.get<string>('RABBITMQ_DIRECT_EXCHANGE_TYPE') ||
        'direct'
      );
    }

    get delayedRetriesNumber(): number {
      const val = this.configService.get<string>('RABBITMQ_DELAYED_RETRIES');
      return val !== undefined ? parseInt(val, 10) : 3;
    }

    get immediateRetriesNumber(): number {
      const val = this.configService.get<string>('RABBITMQ_IMMEDIATE_RETRIES');
      return val !== undefined ? parseInt(val, 10) : 3;
    }

    get retryQueueMessageTtl(): number {
      const val = this.configService.get<string>(
        'RABBITMQ_RETRY_QUEUE_MESSAGE_TTL',
      );
      return val !== undefined ? parseInt(val, 10) : 5000;
    }

    get consumeMessageLimit(): number {
      const val = this.configService.get<string>(
        'RABBITMQ_CONSUME_MESSAGE_LIMIT',
      );
      return val !== undefined ? parseInt(val, 10) : 10;
    }

    get dispatchMessageLimit(): number {
      const val = this.configService.get<string>(
        'RABBITMQ_DISPATCH_MESSAGE_LIMIT',
      );
      return val !== undefined ? parseInt(val, 10) : 10;
    }
  }

  return DynamicRabbitMqConfig;
}
