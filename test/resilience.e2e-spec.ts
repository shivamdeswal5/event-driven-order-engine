import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'crypto';
import { OutboxMessage } from '../modules/shared/src/domain/outbox/outbox-message.entity';
import { OutboxMessageRelay } from '../modules/shared/src/infrastructure/message-bus/outbox-message-relay.service';
import { RabbitmqConnectionService } from '../modules/shared/src/infrastructure/message-bus/rabbitmq/config/rabbitmq-connection.service';
import { RabbitmqConfigurerService } from '../modules/shared/src/infrastructure/message-bus/rabbitmq/config/rabbitmq-configurer.service';
import {
  CONSUMER_MODULE_MAP,
  PRODUCER_MODULE_MAP,
} from '../modules/shared/src/infrastructure/message-bus/cli-commands/module.map';

describe('Resilience and Outbox Concurrency (e2e)', () => {
  describe('Outbox Concurrency Safety (SELECT FOR UPDATE SKIP LOCKED)', () => {
    let app1: INestApplication;
    let app2: INestApplication;
    let relay1: OutboxMessageRelay;
    let relay2: OutboxMessageRelay;
    let em: EntityManager;

    beforeEach(async () => {
      // Force DB_HOST to localhost if running in local test run
      if (
        !process.env.DB_HOST ||
        process.env.DB_HOST === 'postgres' ||
        process.env.DB_HOST === 'order-engine-database'
      ) {
        process.env.DB_HOST = 'localhost';
      }
      if (
        !process.env.RABBITMQ_URL ||
        process.env.RABBITMQ_URL.includes('@rabbitmq:')
      ) {
        const user = process.env.RABBITMQ_USER || 'deswal';
        const pass = process.env.RABBITMQ_PASSWORD || 'deswal';
        process.env.RABBITMQ_URL = `amqp://${user}:${pass}@localhost:5672`;
      }

      const moduleFixture1: TestingModule = await Test.createTestingModule({
        imports: [PRODUCER_MODULE_MAP['order']],
      }).compile();

      app1 = moduleFixture1.createNestApplication();
      await app1.init();
      relay1 = app1.get(OutboxMessageRelay);
      em = app1.get(EntityManager).fork();

      const moduleFixture2: TestingModule = await Test.createTestingModule({
        imports: [PRODUCER_MODULE_MAP['order']],
      }).compile();

      app2 = moduleFixture2.createNestApplication();
      await app2.init();
      relay2 = app2.get(OutboxMessageRelay);
    });

    afterEach(async () => {
      if (app1) {
        await app1.close();
      }
      if (app2) {
        await app2.close();
      }
    });

    it('should concurrently process distinct outbox messages without double-publishing or blocking', async () => {
      const schema = 'order_schema';

      // Clear existing unprocessed outbox messages in order_schema
      await RequestContext.create(em, async () => {
        await em.nativeDelete(OutboxMessage, { processed: false }, { schema });
      });

      // Insert two new unprocessed outbox messages
      const msg1 = em.create(
        OutboxMessage,
        {
          id: randomUUID(),
          eventType: 'OrderPlacedEvent',
          payload: { orderId: randomUUID() },
          exchange: 'order-exchange',
          routingKey: 'order.placed',
          correlationId: randomUUID(),
          processed: false,
        },
        { schema },
      );

      const msg2 = em.create(
        OutboxMessage,
        {
          id: randomUUID(),
          eventType: 'OrderPlacedEvent',
          payload: { orderId: randomUUID() },
          exchange: 'order-exchange',
          routingKey: 'order.placed',
          correlationId: randomUUID(),
          processed: false,
        },
        { schema },
      );

      await RequestContext.create(em, async () => {
        await em.persistAndFlush([msg1, msg2]);
      });

      // Run two concurrent dispatch messages processes with limit of 1
      // Thanks to SKIP LOCKED, they should execute in parallel, lock separate rows, and process both
      await Promise.all([
        relay1.dispatchMessages(schema, 1),
        relay2.dispatchMessages(schema, 1),
      ]);

      // Assert that both messages are marked as processed
      await RequestContext.create(em, async () => {
        const updatedMsg1 = await em.findOne(OutboxMessage, msg1.id, {
          schema,
        });
        const updatedMsg2 = await em.findOne(OutboxMessage, msg2.id, {
          schema,
        });

        expect(updatedMsg1).toBeDefined();
        expect(updatedMsg1!.processed).toBe(true);
        expect(updatedMsg1!.processedAt).toBeDefined();

        expect(updatedMsg2).toBeDefined();
        expect(updatedMsg2!.processed).toBe(true);
        expect(updatedMsg2!.processedAt).toBeDefined();
      });
    });
  });

  describe('RabbitMQ Retry & DLQ Routing (Recoverability)', () => {
    let app: INestApplication;
    let connectionService: RabbitmqConnectionService;
    let configurerService: RabbitmqConfigurerService;

    beforeEach(async () => {
      // Force DB_HOST and RABBITMQ_URL to localhost
      if (
        !process.env.DB_HOST ||
        process.env.DB_HOST === 'postgres' ||
        process.env.DB_HOST === 'order-engine-database'
      ) {
        process.env.DB_HOST = 'localhost';
      }
      if (
        !process.env.RABBITMQ_URL ||
        process.env.RABBITMQ_URL.includes('@rabbitmq:')
      ) {
        const user = process.env.RABBITMQ_USER || 'deswal';
        const pass = process.env.RABBITMQ_PASSWORD || 'deswal';
        process.env.RABBITMQ_URL = `amqp://${user}:${pass}@localhost:5672`;
      }

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [CONSUMER_MODULE_MAP['order']],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      connectionService = app.get(RabbitmqConnectionService);
      configurerService = app.get(RabbitmqConfigurerService);

      await connectionService.connect();

      // Setup topology to assert exchanges, queues, and bindings
      await configurerService.consumerTopologyConfigurer(['OrderPlacedEvent']);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should route failing messages to the retry queue and update redelivery count', async () => {
      const channel = (connectionService as any).channel;
      expect(channel).toBeDefined();

      const retryQueue = 'order-retry-queue';

      // Purge retry queue to ensure no interference
      await channel.purgeQueue(retryQueue);

      const mockMessage: any = {
        content: Buffer.from(JSON.stringify({ orderId: 'test-order-retry' })),
        fields: {
          deliveryTag: 1,
          redelivered: false,
          exchange: 'order-exchange',
          routingKey: 'order.placed',
        },
        properties: {
          messageId: 'test-retry-message-id',
          type: 'OrderPlacedEvent',
          headers: {
            redelivery_count: 0,
          },
        },
      };

      // Call connectionService.retry directly to simulate a transient consumer error
      await connectionService.retry(mockMessage, [
        new Error('Transient connection timeout'),
      ]);

      // Give a tiny buffer for RabbitMQ delivery
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get message from retry queue
      const amqpMsg = await channel.get(retryQueue, { noAck: true });
      expect(amqpMsg).not.toBe(false);

      const payload = JSON.parse(amqpMsg.content.toString());
      expect(payload.orderId).toBe('test-order-retry');

      const headers = amqpMsg.properties.headers;
      expect(headers).toBeDefined();
      expect(Number(headers.redelivery_count)).toBe(1);
    });

    it('should route messages exceeding max retries to the error queue (DLQ) with error headers', async () => {
      const channel = (connectionService as any).channel;
      expect(channel).toBeDefined();

      const errorQueue = 'order-error-queue';

      // Purge error queue to ensure no interference
      await channel.purgeQueue(errorQueue);

      const mockMessage: any = {
        content: Buffer.from(JSON.stringify({ orderId: 'test-order-dlq' })),
        fields: {
          deliveryTag: 2,
          redelivered: false,
          exchange: 'order-exchange',
          routingKey: 'order.placed',
        },
        properties: {
          messageId: 'test-dlq-message-id',
          type: 'OrderPlacedEvent',
          headers: {
            redelivery_count: 3, // Exceeds the max
          },
        },
      };

      // Call connectionService.deadLetter directly to simulate permanent failure
      await connectionService.deadLetter(mockMessage, [
        new Error('Fatal database constraint failure'),
      ]);

      // Give a tiny buffer for RabbitMQ delivery
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get message from error queue
      const amqpMsg = await channel.get(errorQueue, { noAck: true });
      expect(amqpMsg).not.toBe(false);

      const payload = JSON.parse(amqpMsg.content.toString());
      expect(payload.orderId).toBe('test-order-dlq');

      const headers = amqpMsg.properties.headers;
      expect(headers).toBeDefined();
      expect(headers.exception_details).toBeDefined();
      expect(headers.exception_details[0].exception_type).toBe(
        'Fatal database constraint failure',
      );
    });
  });
});
