import { Injectable } from '@nestjs/common';
import { RabbitmqConnectionService } from './rabbitmq-connection.service';
import { ConfigType } from '../rabbitmq.interface';

@Injectable()
export class RabbitmqConfigurerService {
  private connection: RabbitmqConnectionService;

  constructor(private rabbitmqConnectionService: RabbitmqConnectionService) {
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

  async consumerTopologyConfigurer() {
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
  }
}
