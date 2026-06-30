import { Migration } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_INVENTORY || 'inventory_schema';

export class CreateSeeds1710000000015 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "${schema}"."seeds" (
        "id"           SERIAL      PRIMARY KEY,
        "seeder_name"  VARCHAR     NOT NULL UNIQUE,
        "ran_at"       TIMESTAMP   NOT NULL DEFAULT now()
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "${schema}"."seeds" CASCADE;
    `);
  }
}
