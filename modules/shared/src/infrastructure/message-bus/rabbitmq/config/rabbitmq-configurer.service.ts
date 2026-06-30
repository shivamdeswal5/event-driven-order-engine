import { Injectable } from '@nestjs/common';
import { RabbitmqConnectionService } from './rabbitmq-connection.service';
import { ConfigType } from '../rabbitmq.interface';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';

@Injectable()
export class RabbitmqConfigurerService {
  private connection: RabbitmqConnectionService;

  constructor(
    private rabbitmqConnectionService: RabbitmqConnectionService,
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {
    this.connection = this.rabbitmqConnectionService;
  }

  private get config(): ConfigType {
    return this.connection.getConnectionConfiguration();
  }

  async publisherTopologyConfigurer() {
    if (this.config.primaryQueueExchange) {
      await this.connection.exchange(
        this.config.primaryQueueExchange,
        this.config.primaryQueueExchangeType || 'topic',
      );
    }
  }

  async consumerTopologyConfigurer(signatureTypes: string[] = []) {
    if (this.config.retryQueueExchange) {
      await this.connection.exchange(
        this.config.retryQueueExchange,
        this.config.retryQueueExchangeType || 'direct',
      );
    }
    if (this.config.primaryQueueExchange) {
      await this.connection.exchange(
        this.config.primaryQueueExchange,
        this.config.primaryQueueExchangeType || 'topic',
      );
    }

    if (this.config.primaryQueue && this.config.primaryQueueExchange) {
      await this.connection.queue(
        this.config.primaryQueueExchange,
        this.config.primaryQueue,
        { durable: true },
        this.config.primaryQueueBindingKey || '',
      );
    }

    for (const signatureType of signatureTypes) {
      const destination = this.messageDestinationRegistry.get(signatureType);
      if (destination) {
        // Assert the exchange first
        await this.connection.exchange(destination.exchange, 'topic');
        // Bind the primary queue to this exchange with the routing key
        if (this.config.primaryQueue) {
          console.log(
            `[Topology] Binding queue ${this.config.primaryQueue} to exchange ${destination.exchange} with routing key ${destination.routingKey}`,
          );
          await this.connection.queue(
            destination.exchange,
            this.config.primaryQueue,
            { durable: true },
            destination.routingKey,
          );
        }
      }
    }

    if (this.config.retryQueue && this.config.retryQueueExchange) {
      await this.connection.queue(
        this.config.retryQueueExchange,
        this.config.retryQueue,
        {
          durable: true,
          deadLetterExchange: this.config.primaryQueueExchange,
          messageTtl: this.config.retryQueueMessageTtl,
          ...(this.config.primaryQueueBindingKey && {
            deadLetterRoutingKey: this.config.primaryQueueBindingKey,
          }),
        },
        this.config.retryQueueBindingKey || '',
      );
    }

    if (this.config.errorQueueExchange) {
      await this.connection.exchange(
        this.config.errorQueueExchange,
        this.config.errorQueueExchangeType || 'direct',
      );
    }

    if (this.config.errorQueue && this.config.errorQueueExchange) {
      await this.connection.queue(
        this.config.errorQueueExchange,
        this.config.errorQueue,
        { durable: true },
        this.config.errorQueueRoutingKey || '',
      );
    }
  }
}
