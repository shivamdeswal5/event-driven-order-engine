import { Command, CommandRunner, Option } from 'nest-commander';
import { OutboxMessageRelay } from '../outbox-message-relay.service';

interface BasicCommandOptions {
  limit: number;
  schema: string;
}

@Command({
  name: 'dispatch-messages',
  description: 'Dispatch messages from outbox based on schema',
})
export class DispatchMessages extends CommandRunner {
  constructor(
    private readonly outboxMessageRelay: OutboxMessageRelay,
  ) {
    super();
  }

  async run(passedParams: string[], options: BasicCommandOptions): Promise<void> {
    const { schema, limit } = options;
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

    await this.outboxMessageRelay.dispatchMessages(targetSchema, limit);
    process.exit(0);
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
}
