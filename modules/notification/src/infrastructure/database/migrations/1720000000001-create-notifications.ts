import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_NOTIFICATION;

export class CreateNotifications1720000000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."notifications" (
        "id"              UUID         PRIMARY KEY,
        "order_id"        UUID         NOT NULL,
        "event_type"      VARCHAR(255) NOT NULL,
        "message"         TEXT         NOT NULL,
        "created_at"      TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`
      CREATE INDEX "idx_notifications_order_id" ON "${schema}"."notifications" ("order_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "${schema}"."idx_notifications_order_id";
    `);
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."notifications" CASCADE;
    `);
  }
}
