import { Injectable } from '@nestjs/common';
import { RabbitmqConnectionService } from './rabbitmq/config/rabbitmq-connection.service';
import * as RabbitMQ from 'amqplib';
import { InboxMessageRepository } from '../repository/inbox/inbox-message.repository';
import { CreateRequestContext } from '@mikro-orm/core';
import { SignatureTypes } from './rabbitmq/signature-types';

@Injectable()
export class InboxMessageHandler {
  constructor(
    private readonly rabbitmqConnectionService: RabbitmqConnectionService,
    private readonly signatureTypes: SignatureTypes,
    private readonly inboxMessageRepository: InboxMessageRepository,
  ) {}

  getSignatureTypes() {
    return this.signatureTypes.getSignatureTypes();
  }

  @CreateRequestContext<InboxMessageHandler>(
    (ctx) => ctx.inboxMessageRepository,
  )
  async handleMessage(
    message: RabbitMQ.Message,
    max_retry_counts: number,
    schema: string,
  ) {
    const messageId = message.properties.messageId;
    const message_type =
      message.properties.type || message.properties.headers?.type;

    const signatureTypes = this.signatureTypes.getSignatureTypes();
    const handlers = signatureTypes[message_type];

    if (!handlers) {
      console.log(
        `INFO No handler registered for message type: ${message_type}`,
      );
      return;
    }

    const handlerPromises = handlers.map(async (lazyHandler) => {
      const handler = await lazyHandler;
      let retryCount = max_retry_counts;

      const duplicateMessage =
        await this.inboxMessageRepository.getInboxMessageById(
          messageId,
          handler.getHandlerName(),
          schema,
        );

      if (duplicateMessage) {
        console.log(
          `INFO Message with id ${messageId} already handled with ${handler.getHandlerName()}. Duplicate message ignored.`,
        );
        return;
      }

      const parsedMessage =
        this.rabbitmqConnectionService.robustParseMessageContent(message);

      const messageObj = {
        messageId: messageId,
        body: parsedMessage,
      };

      let err: Error = new Error('Processing failed');

      while (retryCount >= 0) {
        try {
          console.log(
            `INFO Handling message with messageId: ${messageId} and handler ${handler.getHandlerName()}`,
          );
          await handler.handle(messageObj);
          console.log(`INFO Message ${messageId} handled successfully.`);
          return;
        } catch (error: any) {
          retryCount--;
          err = error;
        }
      }

      if (retryCount < 0) throw err;
    });

    const results = await Promise.allSettled(handlerPromises);
    const rejectedPromises = results.filter(
      (result) => result.status === 'rejected',
    );
    if (rejectedPromises.length) {
      throw rejectedPromises.map((result: any) => result.reason);
    }
  }
}
