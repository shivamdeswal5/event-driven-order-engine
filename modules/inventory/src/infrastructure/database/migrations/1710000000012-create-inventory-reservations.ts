import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_INVENTORY;

export class CreateInventoryReservations1710000000012 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."inventory_reservations" (
        "id"         UUID      PRIMARY KEY,
        "order_id"   UUID      NOT NULL,
        "product_id" UUID      NOT NULL,
        "quantity"   INT       NOT NULL,
        "status"     INT       NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."inventory_reservations" CASCADE;
    `);
  }
}
