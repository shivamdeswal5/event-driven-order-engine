import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_SHIPPING;

export class CreateOutbox1710000000032 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."outbox_messages" (
        "id"             UUID         PRIMARY KEY,
        "event_type"     VARCHAR(255) NOT NULL,
        "payload"        JSON         NOT NULL,
        "exchange"       VARCHAR(255) NOT NULL,
        "routing_key"    VARCHAR(255) NOT NULL,
        "correlation_id" VARCHAR(255) NOT NULL,
        "causation_id"   VARCHAR(255),
        "processed"      BOOLEAN      NOT NULL DEFAULT false,
        "processed_at"   TIMESTAMP,
        "created_at"     TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."outbox_messages" CASCADE;
    `);
  }
}
