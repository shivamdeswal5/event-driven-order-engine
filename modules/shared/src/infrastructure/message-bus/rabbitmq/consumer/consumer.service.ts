import { Injectable } from '@nestjs/common';
import * as RabbitMQ from 'amqplib';
import { RabbitmqConfigurerService } from '../config/rabbitmq-configurer.service';
import { RabbitmqConnectionService } from '../config/rabbitmq-connection.service';
import { ConfigType, ConsumerOptions } from '../rabbitmq.interface';
import { InboxMessageHandler } from '../../inbox-message-handler.service';
import { RabbitmqRuntimeConfig } from '../config/rabbitmq-runtime-config.service';

@Injectable()
export class ConsumerService {
  private channel!: any;
  private signatureTypes: string[];
  private prefetchLimit: number;
  private targetSchema: string = '';

  constructor(
    private readonly rabbitmqConfigurerService: RabbitmqConfigurerService,
    private readonly connection: RabbitmqConnectionService,
    private readonly messageHandler: InboxMessageHandler,
    private rabbitmqRuntimeConfig: RabbitmqRuntimeConfig,
  ) {
    this.prefetchLimit = this.config.consumeMessageLimit;
    this.signatureTypes = Object.keys(this.messageHandler.getSignatureTypes());
    this.connection.rabbitMqEvents.on('connected', this.consume.bind(this));
  }

  private get config(): ConfigType {
    return this.connection.getConnectionConfiguration();
  }

  async consumeMessage(options: ConsumerOptions) {
    this.prefetchLimit = options.limit || this.prefetchLimit;
    this.targetSchema = options.schema || '';

    this.rabbitmqRuntimeConfig.setRuntimeConfig({
      primaryQueue: options.primaryQueue,
      primaryQueueBindingKey: options.primaryQueueBindingKey,
      primaryQueueExchange: options.primaryQueueExchange,
      primaryQueueExchangeType: options.primaryQueueExchangeType,
      retryQueue: options.retryQueue,
      retryQueueBindingKey: options.retryQueueBindingKey,
      retryQueueExchange: options.retryQueueExchange,
      retryQueueExchangeType: options.retryQueueExchangeType,
      immediateRetriesNumber: options.immediateRetriesNumber,
      delayedRetriesNumber: options.delayedRetriesNumber,
      retryQueueMessageTtl: options.retryQueueMessageTtl,
      errorQueueExchange: options.errorQueueExchange,
      errorQueueExchangeType: options.errorQueueExchangeType,
      errorQueueRoutingKey: options.errorQueueRoutingKey,
      appName: options.appName,
    });

    await this.connection.connect();
  }

  private async consume() {
    this.channel = this.connection.getChannel();
    this.signatureTypes = Object.keys(this.messageHandler.getSignatureTypes());
    await this.channel?.prefetch(this.prefetchLimit);
    await this.rabbitmqConfigurerService.consumerTopologyConfigurer();
    await this.startConsuming();
    console.log(
      `Waiting for messages in ${this.config.primaryQueue}...`,
      `Registered signatures: [${this.signatureTypes.join(', ')}]`,
    );
  }

  private hasBeenRedeliveredTooMuch(redeliveryCount: number) {
    return redeliveryCount >= this.config.delayedRetriesNumber;
  }

  private async handleError(
    message: RabbitMQ.Message,
    error: Array<Error>,
    redeliveryCount: number,
  ) {
    if (this.hasBeenRedeliveredTooMuch(redeliveryCount)) {
      await this.connection.deadLetter(message, error);
    } else {
      await this.connection.retry(message, error);
    }
  }

  async startConsuming() {
    if (!this.channel) {
      console.warn('WARNING: Cannot start consuming, channel is not available.');
      return;
    }
    await this.channel.consume(
      this.config.primaryQueue || '',
      async (message: RabbitMQ.Message | null) => {
        if (message === null) return;
        if (!message?.properties?.headers) message.properties.headers = {};

        console.log(
          '\n\n================= NEW MESSAGE CONSUMING AT',
          new Date(),
          '=================',
        );

        const redeliveryCount =
          message.properties.headers['redelivery_count'] || 0;
        const type =
          message?.properties?.type || message?.properties?.headers?.type;
        const retryEndpoint = message?.properties?.headers?.retry_endpoint;

        console.log(
          'INFO Received message:',
          type,
          '|',
          'Message redelivery count:',
          redeliveryCount,
        );

        if (!message.properties?.messageId) {
          console.log(
            'INFO Message ignored: Message does not have a messageId.',
          );
          this?.channel.ack(message);
          return;
        }

        if (
          !type ||
          (this.signatureTypes.length > 0 &&
            !this.signatureTypes.includes(type))
        ) {
          console.log(
            'INFO Message ignored: No available handler found or missing message type property.',
          );
          this?.channel.ack(message);
          return;
        }

        if (redeliveryCount > 0 && retryEndpoint !== this.config.appName) {
          console.log(
            'INFO Message ignored: Message is not intended for this service.',
          );
          this?.channel.ack(message);
          return;
        }

        try {
          await this.messageHandler.handleMessage(
            message,
            this.config.immediateRetriesNumber,
            this.targetSchema,
          );
        } catch (error: any) {
          const errors = Array.isArray(error) ? error : [error];
          await this.handleError(message, errors, redeliveryCount);
        } finally {
          this?.channel.ack(message);
        }
      },
    );
  }
}
