import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_SHIPPING;

export class CreateShipments1710000000031 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."shipments" (
        "id"              UUID         PRIMARY KEY,
        "order_id"        UUID         NOT NULL,
        "status"          INT          NOT NULL DEFAULT 0,
        "carrier"         VARCHAR(100),
        "tracking_number" VARCHAR(100),
        "shipped_at"      TIMESTAMP,
        "delivered_at"    TIMESTAMP,
        "created_at"      TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP    NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`
      ALTER TABLE "${schema}"."shipments"
        ADD CONSTRAINT "shipments_order_id_unique" UNIQUE ("order_id");
    `);

    this.addSql(`
      CREATE INDEX "idx_shipments_status" ON "${schema}"."shipments" ("status");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "${schema}"."idx_shipments_status";
    `);
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."shipments" CASCADE;
    `);
  }
}
