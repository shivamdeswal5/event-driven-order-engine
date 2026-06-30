import { Command, CommandRunner } from 'nest-commander';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { DatabaseSeeder } from '../../../../../inventory/src/infrastructure/database/seeders/database-seeder';

@Command({
  name: 'seed-db',
  description: 'Seeds the database with mock inventory products',
})
@Injectable()
export class SeedDbCommand extends CommandRunner {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async run(): Promise<void> {
    console.log('Starting database seeding...');
    const forkEm = this.em.fork();
    const seeder = new DatabaseSeeder();
    try {
      await seeder.run(forkEm);
      console.log('Database seeding completed successfully.');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }
}
