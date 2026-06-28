import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_ORDER;

export class CreateOrders1710000000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    this.addSql(`
      CREATE TABLE "${schema}"."orders" (
        "id"              UUID          PRIMARY KEY,
        "customer_id"     UUID          NOT NULL,
        "total_price"     DECIMAL(10,2) NOT NULL,
        "status"          VARCHAR(255)  NOT NULL DEFAULT 'PENDING',
        "cancel_reason"   VARCHAR(255),
        "created_at"      TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP     NOT NULL DEFAULT now()
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."orders" CASCADE;
    `);
  }
}
