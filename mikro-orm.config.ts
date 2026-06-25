import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

/**
 * MikroORM configuration file.
 *
 * Used by:
 * - The NestJS application at runtime (via @mikro-orm/nestjs module)
 * - The MikroORM CLI for migrations (npx mikro-orm migration:create, etc.)
 *
 * This file is the single source of truth for database connection settings.
 */
export default defineConfig({
  // Connection
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || 'order_engine',
  user: process.env.DB_USER || 'order_user',
  password: process.env.DB_PASSWORD || 'order_pass',

  // Entity discovery — will scan for all .entity.ts files
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],

  // Migrations
  extensions: [Migrator],
  migrations: {
    path: './migrations',
    pathTs: './migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
  },

  // Development settings
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: false,

  // Schema settings
  schemaGenerator: {
    disableForeignKeys: false,
  },
});
