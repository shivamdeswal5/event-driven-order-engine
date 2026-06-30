import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_INVENTORY;

export class CreateProducts1710000000011 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."products" (
        "id"                UUID          PRIMARY KEY,
        "name"              VARCHAR(255)  NOT NULL,
        "sku"               VARCHAR(255)  NOT NULL,
        "stock_quantity"    INT           NOT NULL DEFAULT 0,
        "reserved_quantity" INT           NOT NULL DEFAULT 0,
        "unit_price"        DECIMAL(10,2) NOT NULL,
        "created_at"        TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP     NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`
      ALTER TABLE "${schema}"."products"
        ADD CONSTRAINT "products_sku_unique" UNIQUE ("sku");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."products" CASCADE;
    `);
  }
}
