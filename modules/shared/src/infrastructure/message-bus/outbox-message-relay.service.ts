import { Injectable } from '@nestjs/common';
import { CreateRequestContext } from '@mikro-orm/core';
import { ProducerService } from './rabbitmq/producer/producer.service';
import { OutboxMessageRepository } from '../repository/outbox/outbox-message.repository';

@Injectable()
export class OutboxMessageRelay {
  constructor(
    private readonly producerService: ProducerService,
    private readonly repository: OutboxMessageRepository,
  ) {}

  @CreateRequestContext<OutboxMessageRelay>((ctx) => ctx.repository)
  async dispatchMessages(schema: string, limit: number) {
    try {
      const [messages] = await this.repository.findAndCount(
        { processed: false },
        { limit, schema },
      );
      if (!messages.length) {
        console.log('INFO: No messages pending to dispatch.');
        return;
      }

      await this.producerService.publishMessages(messages);
      console.log(`INFO: Published ${messages.length} messages.`);
    } catch (error) {
      console.log('Error in publishing messages ', error);
    }
  }
}
