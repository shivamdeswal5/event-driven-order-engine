import { Injectable } from '@nestjs/common';
import { RabbitmqConfigurerService } from '../config/rabbitmq-configurer.service';
import { RabbitmqConnectionService } from '../config/rabbitmq-connection.service';
import { ConfigType, RabbitMQPublishMessage } from '../rabbitmq.interface';
import { OutboxMessageRepository } from 'src/shared/infrastructure/repository/outbox/outbox-message.repository';
import { OutboxMessage } from 'src/shared/infrastructure/outbox/outbox-message.entity';

@Injectable()
export class ProducerService {
  private connection: RabbitmqConnectionService;

  constructor(
    private readonly rabbitmqConfigurerService: RabbitmqConfigurerService,
    private readonly rabbitmqConnectionService: RabbitmqConnectionService,
    private readonly outboxMessageRepository: OutboxMessageRepository,
  ) {
    this.connection = this.rabbitmqConnectionService;
  }

  private get config(): ConfigType {
    return this.connection.getConnectionConfiguration();
  }

  async publishMessages(messages: OutboxMessage[]) {
    await this.connect();

    for (const message of messages) {
      await this.publisher(message);
    }

    await this.close();
  }

  private async connect() {
    await this.connection.connect();
    await this.rabbitmqConfigurerService.publisherTopologyConfigurer();
  }

  private async close() {
    await this.connection.closeChannel();
  }

  private async publisher(outboxMessage: OutboxMessage) {
    try {
      const messageToPublish: RabbitMQPublishMessage = {
        exchange: outboxMessage.exchange || this.config.primaryQueueExchange || '',
        bindingKey: outboxMessage.routingKey,
        content: JSON.stringify(outboxMessage.payload),
        properties: {
          messageId: outboxMessage.id,
          type: outboxMessage.eventType,
          correlationId: outboxMessage.correlationId,
          headers: {
            causationId: outboxMessage.causationId,
            type: outboxMessage.eventType,
          },
          persistent: true,
        },
      };

      const isPublished = await this.connection.publish(messageToPublish);
      if (!isPublished) throw new Error('Message could not be published.');

      outboxMessage.processed = true;
      outboxMessage.processedAt = new Date();

      await this.outboxMessageRepository.save(outboxMessage);
    } catch (error) {
      console.log(
        `Error while publishing message ${outboxMessage.eventType} with id ${outboxMessage.id}`,
        error,
      );
    }
  }
}
