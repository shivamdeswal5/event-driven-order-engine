import { Command, CommandRunner, Option } from 'nest-commander';
import { OutboxMessageRelay } from '../outbox-message-relay.service';

interface BasicCommandOptions {
  limit: number;
  schema: string;
  continuous?: boolean;
}

@Command({
  name: 'dispatch-messages',
  description: 'Dispatch messages from outbox based on schema',
})
export class DispatchMessages extends CommandRunner {
  constructor(private readonly outboxMessageRelay: OutboxMessageRelay) {
    super();
  }

  async run(
    passedParams: string[],
    options: BasicCommandOptions,
  ): Promise<void> {
    const { schema, limit } = options;
    const schemaMapper: Record<string, string> = {
      order: process.env.DB_SCHEMA_ORDER || 'order_schema',
      inventory: process.env.DB_SCHEMA_INVENTORY || 'inventory_schema',
      payment: process.env.DB_SCHEMA_PAYMENT || 'payment_schema',
      shipping: process.env.DB_SCHEMA_SHIPPING || 'shipping_schema',
      notification: process.env.DB_SCHEMA_NOTIFICATION || 'notification_schema',
    };

    const targetSchema = schemaMapper[schema];
    if (!targetSchema) {
      console.error(
        `ERROR: Invalid schema/module name "${schema}". Please provide a valid module name: order, inventory, payment, shipping, notification.`,
      );
      process.exit(1);
    }

    if (options.continuous) {
      console.log(
        `INFO: Starting Outbox Relay in continuous mode for schema "${targetSchema}"...`,
      );
      let running = true;

      const stop = () => {
        console.log('INFO: Stopping continuous outbox relay...');
        running = false;
      };

      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);

      while (running) {
        await this.outboxMessageRelay.dispatchMessages(targetSchema, limit);
        // Sleep for 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      process.exit(0);
    } else {
      await this.outboxMessageRelay.dispatchMessages(targetSchema, limit);
      process.exit(0);
    }
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
    flags: '-c, --continuous',
    description: 'Run continuously in a loop',
    defaultValue: false,
  })
  parseContinuous(val: string): boolean {
    return true;
  }
}
