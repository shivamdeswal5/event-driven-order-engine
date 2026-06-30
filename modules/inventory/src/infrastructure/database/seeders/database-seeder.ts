import { EntityManager } from '@mikro-orm/core';
import { ProductSeeder } from './product-seeder';

export class DatabaseSeeder {
  async run(entityManager: EntityManager): Promise<void> {
    const seeders = [ProductSeeder];
    for (const SeederClass of seeders) {
      const seederInstance = new SeederClass();
      await seederInstance.run(entityManager);
    }
  }
}
