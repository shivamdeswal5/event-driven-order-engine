import { Injectable } from '@nestjs/common';
import { CreateRequestContext, LockMode } from '@mikro-orm/core';
import { ProducerService } from './rabbitmq/producer/producer.service';
import { OutboxMessageRepository } from '../repository/outbox/outbox-message.repository';
import { OutboxMessage } from '@shared/domain/outbox/outbox-message.entity';

@Injectable()
export class OutboxMessageRelay {
  constructor(
    private readonly producerService: ProducerService,
    private readonly repository: OutboxMessageRepository,
  ) {}

  @CreateRequestContext<OutboxMessageRelay>((ctx) => ctx.repository)
  async dispatchMessages(schema: string, limit: number) {
    let publishStarted = false;
    try {
      const em = this.repository.getEntityManager();
      let publishedCount = 0;

      await em.transactional(async (transactionalEm) => {
        const messages = await transactionalEm.find(
          OutboxMessage,
          { processed: false },
          {
            limit,
            schema,
            lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
          },
        );

        if (!messages.length) {
          return;
        }

        await this.producerService.startPublishing();
        publishStarted = true;

        // Publish concurrently to RabbitMQ
        await Promise.all(
          messages.map((message) =>
            this.producerService.publishSingleMessage(message),
          ),
        );

        // Bulk-update database records in a single query
        const ids = messages.map((m) => m.id);
        const now = new Date();
        const qb = transactionalEm.createQueryBuilder(OutboxMessage);
        qb.update({ processed: true, processedAt: now })
          .where({ id: { $in: ids } })
          .withSchema(schema);
        await qb.execute();

        publishedCount = messages.length;

        await this.producerService.finishPublishing();
        publishStarted = false;
      });

      if (publishedCount > 0) {
        console.log(`INFO: Published ${publishedCount} messages.`);
      }
    } catch (error) {
      console.log('Error in publishing messages ', error);
    } finally {
      if (publishStarted) {
        try {
          await this.producerService.finishPublishing();
        } catch (closeError) {
          console.log(
            'Error while closing publisher channel on failure: ',
            closeError,
          );
        }
      }
    }
  }
}
