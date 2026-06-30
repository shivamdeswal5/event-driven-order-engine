import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_PAYMENT;

export class CreatePayments1710000000021 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."payments" (
        "id"             UUID          PRIMARY KEY,
        "order_id"       UUID          NOT NULL,
        "amount"         DECIMAL(12,2) NOT NULL,
        "currency"       VARCHAR(3)    NOT NULL DEFAULT 'USD',
        "status"         INT           NOT NULL DEFAULT 0,
        "failure_reason" VARCHAR(500),
        "processed_at"   TIMESTAMP,
        "created_at"     TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP     NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`
      ALTER TABLE "${schema}"."payments"
        ADD CONSTRAINT "payments_order_id_unique" UNIQUE ("order_id");
    `);

    this.addSql(`
      CREATE INDEX "idx_payments_status" ON "${schema}"."payments" ("status");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "${schema}"."idx_payments_status";
    `);
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."payments" CASCADE;
    `);
  }
}
