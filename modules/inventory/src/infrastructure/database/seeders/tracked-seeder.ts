import type { EntityManager } from '@mikro-orm/core';
import * as dotenv from 'dotenv';

dotenv.config();

const schema = process.env.DB_SCHEMA_INVENTORY || 'inventory_schema';

export abstract class TrackedSeeder {
  async run(entityManager: EntityManager): Promise<void> {
    const name = this.constructor.name;
    const table = `"${schema}"."seeds"`;

    const [{ count }] = await entityManager
      .getConnection()
      .execute<{ count: string }>(
        `
        SELECT COUNT(1)::text AS count
          FROM ${table}
         WHERE seeder_name = ?
      `,
        [name],
      );

    if (parseInt(count, 10) > 0) {
      console.log(`${name} already ran—skipping.`);
      return;
    }

    await this.seed(entityManager);

    await entityManager
      .getConnection()
      .execute(`INSERT INTO ${table} (seeder_name) VALUES (?)`, [name]);

    console.log(`${name} completed and recorded.`);
  }

  abstract seed(entityManager: EntityManager): Promise<void>;
}
