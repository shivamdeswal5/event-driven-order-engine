import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../rabbitmq.interface';
import { RabbitmqRuntimeConfig } from './rabbitmq-runtime-config.service';
import { IRabbitMqConfig, RABBITMQ_CONFIG } from './rabbitmq-config.interface';

@Injectable()
export class RabbitmqConfigService {
  private maxReconnectTries: number = 3;
  private reconnectPolicy = true;
  private config!: ConfigType;

  constructor(
    private configService: ConfigService,
    private runtimeConfig: RabbitmqRuntimeConfig,
    @Optional() @Inject(RABBITMQ_CONFIG) private moduleConfig: IRabbitMqConfig,
  ) {
    this.config = {
      appName:
        this.configService.get<string>('app.name') ||
        this.configService.get<string>('APP_NAME') ||
        'event-driven-order-engine',
      dsn:
        this.configService.get<string>('rabbitmq.url') ||
        process.env.RABBITMQ_URL ||
        'amqp://rabbit_user:rabbit_pass@localhost:5672',
      heartbeatInterval: 30,

      delayedRetriesNumber: parseInt(
        this.configService.get<string>('RABBITMQ_DELAYED_RETRIES') || '3',
        10,
      ),
      immediateRetriesNumber: parseInt(
        this.configService.get<string>('RABBITMQ_IMMEDIATE_RETRIES') || '3',
        10,
      ),
      retryQueueMessageTtl: parseInt(
        this.configService.get<string>('RABBITMQ_RETRY_QUEUE_MESSAGE_TTL') ||
          '5000',
        10,
      ),
      consumeMessageLimit: parseInt(
        this.configService.get<string>('RABBITMQ_CONSUME_MESSAGE_LIMIT') ||
          '10',
        10,
      ),
      dispatchMessageLimit: parseInt(
        this.configService.get<string>('RABBITMQ_DISPATCH_MESSAGE_LIMIT') ||
          '10',
        10,
      ),
    };

    const { maxReconnectTries, reconnectPolicy } =
      this.getMaxReconnectTrialsData();
    this.maxReconnectTries = reconnectPolicy ? maxReconnectTries || 3 : 0;
    this.reconnectPolicy = reconnectPolicy;

    if (this.moduleConfig) {
      this.overrideConfig(this.moduleConfig);
    }
  }

  private overrideConfig(moduleConfig: IRabbitMqConfig) {
    if (moduleConfig.appName) this.config.appName = moduleConfig.appName;

    if (moduleConfig.primaryQueue)
      this.config.primaryQueue = moduleConfig.primaryQueue;
    if (moduleConfig.primaryQueueBindingKey)
      this.config.primaryQueueBindingKey = moduleConfig.primaryQueueBindingKey;
    if (moduleConfig.primaryQueueExchange)
      this.config.primaryQueueExchange = moduleConfig.primaryQueueExchange;
    if (moduleConfig.primaryQueueExchangeType)
      this.config.primaryQueueExchangeType =
        moduleConfig.primaryQueueExchangeType;

    if (moduleConfig.retryQueue)
      this.config.retryQueue = moduleConfig.retryQueue;
    if (moduleConfig.retryQueueBindingKey)
      this.config.retryQueueBindingKey = moduleConfig.retryQueueBindingKey;
    if (moduleConfig.retryQueueExchange)
      this.config.retryQueueExchange = moduleConfig.retryQueueExchange;
    if (moduleConfig.retryQueueExchangeType)
      this.config.retryQueueExchangeType = moduleConfig.retryQueueExchangeType;

    if (moduleConfig.errorQueueRoutingKey)
      this.config.errorQueueRoutingKey = moduleConfig.errorQueueRoutingKey;
    if (moduleConfig.errorQueueExchange)
      this.config.errorQueueExchange = moduleConfig.errorQueueExchange;
    if (moduleConfig.errorQueueExchangeType)
      this.config.errorQueueExchangeType = moduleConfig.errorQueueExchangeType;
    if (moduleConfig.errorQueue)
      this.config.errorQueue = moduleConfig.errorQueue;

    if (moduleConfig.delayedRetriesNumber !== undefined)
      this.config.delayedRetriesNumber = moduleConfig.delayedRetriesNumber;
    if (moduleConfig.immediateRetriesNumber !== undefined)
      this.config.immediateRetriesNumber = moduleConfig.immediateRetriesNumber;
    if (moduleConfig.retryQueueMessageTtl !== undefined)
      this.config.retryQueueMessageTtl = moduleConfig.retryQueueMessageTtl;
    if (moduleConfig.consumeMessageLimit !== undefined)
      this.config.consumeMessageLimit = moduleConfig.consumeMessageLimit;
    if (moduleConfig.dispatchMessageLimit !== undefined)
      this.config.dispatchMessageLimit = moduleConfig.dispatchMessageLimit;
  }

  async validateConfig() {
    const requiredVariables = [
      'appName',
      'primaryQueue',
      'primaryQueueBindingKey',
      'primaryQueueExchange',
      'primaryQueueExchangeType',
      'retryQueue',
      'retryQueueBindingKey',
      'retryQueueExchange',
      'retryQueueExchangeType',
      'errorQueueRoutingKey',
      'errorQueue',
      'delayedRetriesNumber',
      'immediateRetriesNumber',
      'retryQueueMessageTtl',
      'dsn',
    ];

    const missingVariables = requiredVariables.filter(
      (variable) =>
        (this.config as any)[variable] === undefined ||
        (this.config as any)[variable] === null,
    );

    if (missingVariables.length === 0) {
      console.log(
        `All prerequisites are met for RabbitMQ for app: ${this.config.appName}`,
      );
    } else {
      missingVariables.forEach((variable) => {
        console.log(
          `Missing required environment variable or config: ${variable}`,
        );
      });
      process.exit(1);
    }
  }

  getConfig() {
    return this.runtimeConfig.mergeWithBase(this.config);
  }

  getConnectionString() {
    return this.config.dsn;
  }

  getConnectionParams() {
    return {
      heartbeat: this.config.heartbeatInterval || 30,
    };
  }

  getMaxReconnectTrialsData() {
    return {
      maxReconnectTries: this.maxReconnectTries,
      reconnectPolicy: this.reconnectPolicy,
    };
  }
}
