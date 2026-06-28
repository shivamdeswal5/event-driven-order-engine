import { Command, CommandRunner, Option } from 'nest-commander';
import { ConsumerService } from '../rabbitmq/consumer/consumer.service';

interface BasicCommandOptions {
  schema: string;
  limit?: number;
  primaryQueue?: string;
  primaryQueueBindingKey?: string;
  primaryQueueExchange?: string;
  primaryQueueExchangeType?: string;
  retryQueue?: string;
  retryQueueBindingKey?: string;
  retryQueueExchange?: string;
  retryQueueExchangeType?: string;
  retryQueueMessageTtl?: number;
  immediateRetriesNumber?: number;
  delayedRetriesNumber?: number;
  errorQueueExchange?: string;
  errorQueueExchangeType?: string;
  errorQueueRoutingKey?: string;
  appName?: string;
}

@Command({ name: 'handle-messages', description: 'handle messages' })
export class HandleMessages extends CommandRunner {
  constructor(private readonly consumerService: ConsumerService) {
    super();
  }

  async run(
    passedParam: string[],
    options?: BasicCommandOptions,
  ): Promise<void> {
    if (!options) return;
    const { schema } = options;

    const schemaMapper: Record<string, string> = {
      order: process.env.DB_ORDER_SCHEMA || 'public',
      inventory: process.env.DB_INVENTORY_SCHEMA || 'public',
      payment: process.env.DB_PAYMENT_SCHEMA || 'public',
      shipping: process.env.DB_SHIPPING_SCHEMA || 'public',
      notification: process.env.DB_NOTIFICATION_SCHEMA || 'public',
    };

    const targetSchema = schemaMapper[schema];
    if (!targetSchema) {
      console.error(
        `ERROR: Invalid schema/module name "${schema}". Please provide a valid module name: order, inventory, payment, shipping, notification.`,
      );
      process.exit(1);
    }
    await this.consumerService.consumeMessage({
      schema: targetSchema,
      limit: options.limit,
      primaryQueue: options.primaryQueue,
      primaryQueueBindingKey: options.primaryQueueBindingKey,
      primaryQueueExchange: options.primaryQueueExchange,
      primaryQueueExchangeType: options.primaryQueueExchangeType,
      retryQueue: options.retryQueue,
      retryQueueBindingKey: options.retryQueueBindingKey,
      retryQueueExchange: options.retryQueueExchange,
      retryQueueExchangeType: options.retryQueueExchangeType,
      retryQueueMessageTtl: options.retryQueueMessageTtl,
      immediateRetriesNumber: options.immediateRetriesNumber,
      delayedRetriesNumber: options.delayedRetriesNumber,
      errorQueueExchange: options.errorQueueExchange,
      errorQueueExchangeType: options.errorQueueExchangeType,
      errorQueueRoutingKey: options.errorQueueRoutingKey,
      appName: options.appName,
    });
  }

  @Option({
    flags: '-l, --limit <limit>',
    description: 'Limit option',
    defaultValue: 10,
  })
  parseLimit(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '-s, --schema <schema>',
    description: 'Target schema / module name',
    required: true,
  })
  parseSchema(val: string): string {
    return val.trim();
  }

  @Option({
    flags: '--primary-queue <queue>',
    description: 'Primary queue name',
  })
  parsePrimaryQueue(val: string): string {
    return val;
  }

  @Option({
    flags: '--primary-queue-binding-key <key>',
    description:
      'Primary queue binding key (required for direct or topic exchange)',
  })
  parsePrimaryQueueBindingKey(val: string): string {
    return val;
  }

  @Option({
    flags: '--primary-queue-exchange <exchange>',
    description: 'Primary queue exchange',
  })
  parsePrimaryQueueExchange(val: string): string {
    return val;
  }

  @Option({
    flags: '--primary-queue-exchange-type <type>',
    description: 'Primary queue exchange type',
  })
  parsePrimaryQueueExchangeType(val: string): string {
    return val;
  }

  @Option({ flags: '--retry-queue <queue>', description: 'Retry queue name' })
  parseRetryQueue(val: string): string {
    return val;
  }

  @Option({
    flags: '--retry-queue-binding-key <key>',
    description: 'Retry binding key',
  })
  parseRetryQueueBindingKey(val: string): string {
    return val;
  }

  @Option({
    flags: '--retry-queue-exchange <exchange>',
    description: 'Retry queue exchange',
  })
  parseRetryQueueExchange(val: string): string {
    return val;
  }

  @Option({
    flags: '--retry-queue-exchange-type <type>',
    description: 'Retry queue exchange type',
  })
  parseRetryQueueExchangeType(val: string): string {
    return val;
  }

  @Option({
    flags: '--immediate-retries-number <num>',
    description: 'Number of immediate retries before moving to delayed queue',
  })
  parseImmediateRetries(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--delayed-retries-number <num>',
    description: 'Number of delayed retries before moving to DLQ',
  })
  parseDelayedRetries(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--retry-queue-message-ttl <ms>',
    description: 'Retry queue TTL in milliseconds',
  })
  parseRetryQueueMessageTtl(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--error-queue-exchange <exchange>',
    description: 'Error queue exchange',
  })
  parseErrorQueueExchange(val: string): string {
    return val;
  }

  @Option({
    flags: '--error-queue-exchange-type <type>',
    description: 'Error queue exchange type',
  })
  parseErrorQueueExchangeType(val: string): string {
    return val;
  }

  @Option({
    flags: '--error-queue-routing-key <key>',
    description: 'Error queue routing key',
  })
  parseErrorQueueRoutingKey(val: string): string {
    return val;
  }

  @Option({
    flags: '--app-name <appName>',
    description: 'App name',
  })
  parseAppName(val: string): string {
    return val;
  }
}
