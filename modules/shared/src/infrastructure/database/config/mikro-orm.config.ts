import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Context-aware MikroORM config factory.
 *
 * Used by:
 * ─ NestJS runtime: called via root mikro-orm.config.ts with contextName='default'
 *   → discovers ALL entities via glob '**', no schema override
 *
 * ─ MikroORM CLI: called with --contextName=<module>
 *   → scopes entity discovery and migrations to that module folder only
 *   → sets the PostgreSQL schema derived from contextName (e.g. 'orders' → 'orders_schema')
 *
 * Schema derivation: contextName.replace(/-/g, '_') + '_schema'
 *   shared        → shared_schema
 *   order         → order_schema
 *   inventory     → inventory_schema
 *   payment       → payment_schema
 *   shipping      → shipping_schema
 *   notification  → notification_schema
 */
export default (contextName: string = 'default'): Options => {
  const isDefault = contextName === 'default';

  // 'default' → discover all module folders; named context → scope to one folder
  const moduleGlob = !isDefault ? contextName : '**';

  // Migration path: each module has its own migrations folder
  const migrationsPath = !isDefault
    ? `dist/modules/${contextName}/src/infrastructure/database/migrations`
    : 'dist/modules/shared/src/infrastructure/database/migrations';

  return {
    driver:   PostgreSqlDriver,
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    dbName:   process.env.DB_DATABASE || 'order_engine',
    user:     process.env.DB_USER     || 'order_user',
    password: process.env.DB_PASSWORD || 'order_pass',

    // Schema: only applied for named (non-default) contexts
    // Derived automatically: 'orders' → 'orders_schema'
    ...(!isDefault && {
      schema: `${contextName.replace(/-/g, '_')}_schema`,
    }),

    // Entity discovery — scoped to context folder or all modules
    entities:   [
      `dist/modules/${moduleGlob}/src/domain/**/*.entity.js`,
      `dist/modules/${moduleGlob}/src/infrastructure/database/**/*.entity.js`,
      'dist/modules/shared/src/domain/**/*.entity.js',
    ],
    entitiesTs: [
      `modules/${moduleGlob}/src/domain/**/*.entity.ts`,
      `modules/${moduleGlob}/src/infrastructure/database/**/*.entity.ts`,
      'modules/shared/src/domain/**/*.entity.ts',
    ],

    extensions: [Migrator],
    migrations: {
      tableName:     'migrations',
      path:          migrationsPath,
      glob:          '!(*.d).{js,ts}',
      transactional: true,
      allOrNothing:  true,
    },

    debug:              process.env.NODE_ENV === 'development',
    allowGlobalContext: false,
    forceUtcTimezone:   true,
    timezone:           'UTC',
  };
};
