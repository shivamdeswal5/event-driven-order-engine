import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_PAYMENT;

export class CreateInbox1710000000023 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."inbox_messages" (
        "id"           UUID         PRIMARY KEY,
        "message_id"   UUID         NOT NULL,
        "handler_name" VARCHAR(255) NOT NULL,
        "event_type"   VARCHAR(255) NOT NULL,
        "created_at"   TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`
      CREATE UNIQUE INDEX "uq_inbox_message_handler"
      ON "${schema}"."inbox_messages" ("message_id", "handler_name");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "${schema}"."uq_inbox_message_handler";
    `);

    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."inbox_messages" CASCADE;
    `);
  }
}
