# MikroORM Migration Strategy

**Version**: 1.1 | **Last Updated**: 2026-06-28

---

## Overview

This project uses a **context-aware, per-module migration strategy** powered by a single
MikroORM config factory function. Each domain module (`order`, `inventory`, etc.) has its
own migration folder and its own PostgreSQL schema, giving true isolation while keeping a
single shared config entry point.

---

## The Two-Context Model: Runtime vs CLI

This is the most important concept to understand. The config file at
`modules/shared/src/infrastructure/database/config/mikro-orm.config.ts` serves two completely
different purposes depending on who calls it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Two Callers                                 │
├────────────────────────────┬────────────────────────────────────────┤
│   NestJS App (Runtime)     │   MikroORM CLI (Migrations)            │
├────────────────────────────┼────────────────────────────────────────┤
│ MikroOrmModule.forRoot()   │ npx mikro-orm migration:up             │
│ contextName = 'default'    │ --contextName=order                    │
│ discovers ALL entities     │ discovers ONLY order entities           │
│ no schema override         │ sets schema = 'order_schema'           │
│ entity decorators provide  │ migration files go into                │
│ per-table schema at query  │ dist/order/infrastructure/database/    │
│ time via process.env       │ migrations/                            │
└────────────────────────────┴────────────────────────────────────────┘
```

---

## Runtime: How Schema Works (Option A — Entity-Level Schema)

At runtime, `contextName=default` means **no schema is set** at the MikroORM config level.
This is intentional — instead, each entity declares its own schema via an environment
variable in the `@Entity` decorator:

```typescript
// modules/order/src/domain/order/order.entity.ts
@Entity({ tableName: 'orders', schema: process.env.DB_SCHEMA_ORDER })
export class Order extends BaseEntity { ... }

// modules/shared/src/domain/inbox/inbox-message.entity.ts
@Entity({ tableName: 'inbox_messages', schema: process.env.DB_SCHEMA_SHARED, ... })
export class InboxMessage extends BaseEntity { ... }
```

This means:
- Every SQL query MikroORM generates will be **schema-qualified**: `order_schema.orders`
- The schema values come from `.env` at application startup
- No PostgreSQL `search_path` configuration needed

### Why this approach?

| Approach | Runtime safety | Env transparency | Complexity |
|---|---|---|---|
| Entity-level schema (✅ ours) | Safe — table names fully qualified | Explicit in `.env` | Low |
| PostgreSQL search_path | Fragile across environments | Hidden config | Medium |
| Config-level schema at runtime | One schema for all — loses isolation | None | Low but wrong |

---

## CLI: How Schema Works (contextName Derivation)

When you run a migration command, the CLI calls the config factory with a named context:

```bash
npm run migration:up:order
# → --contextName=order
# → schema derived: 'order_schema'
# → migrations path: dist/order/infrastructure/database/migrations
```

The factory derives the schema **automatically** from the contextName — no env var needed:

```typescript
...(!isDefault && {
  schema: `${contextName.replace(/-/g, '_')}_schema`,
})
// 'order'        → 'order_schema'
// 'shared'       → 'shared_schema'
// 'notification' → 'notification_schema'
```

This guarantees CLI-executed migrations land in the correct schema, and the migrations
tracking table (`migrations`) is also scoped to that schema.

---

## How MikroOrmModule.forRoot() Reads the Config

`MikroOrmModule.forRoot()` with NO arguments does NOT look for the config automatically.
We explicitly import the root `mikro-orm.config.ts` and pass it:

```typescript
// src/app.module.ts
import mikroOrmConfig from '../mikro-orm.config';
MikroOrmModule.forRoot(mikroOrmConfig)
```

The root `mikro-orm.config.ts` is just a thin delegate:

```typescript
// mikro-orm.config.ts (project root)
import mikroOrmConfigFactory from './modules/shared/src/infrastructure/database/config/mikro-orm.config';
export default mikroOrmConfigFactory('default');
```

This calls the factory with `contextName='default'`, which:
- Sets `moduleGlob = '**'` → discovers ALL entities from ALL modules
- Sets NO schema override → entity decorators control per-table schema at query time

---

## Module Naming Convention

All module names are **singular** to match folder names (`modules/order/`, `modules/payment/`):

| Module folder | `contextName` | CLI schema (derived) | `.env` var | Entity decorator |
|---|---|---|---|---|
| `modules/shared/` | `shared` | `shared_schema` | `DB_SCHEMA_SHARED` | `process.env.DB_SCHEMA_SHARED` |
| `modules/order/` | `order` | `order_schema` | `DB_SCHEMA_ORDER` | `process.env.DB_SCHEMA_ORDER` |
| `modules/inventory/` | `inventory` | `inventory_schema` | `DB_SCHEMA_INVENTORY` | `process.env.DB_SCHEMA_INVENTORY` |
| `modules/payment/` | `payment` | `payment_schema` | `DB_SCHEMA_PAYMENT` | `process.env.DB_SCHEMA_PAYMENT` |
| `modules/shipping/` | `shipping` | `shipping_schema` | `DB_SCHEMA_SHIPPING` | `process.env.DB_SCHEMA_SHIPPING` |
| `modules/notification/` | `notification` | `notification_schema` | `DB_SCHEMA_NOTIFICATION` | `process.env.DB_SCHEMA_NOTIFICATION` |

---

## File Structure

```
mikro-orm.config.ts                                     ← root delegate (calls factory with 'default')

modules/shared/src/infrastructure/database/
├── config/
│   └── mikro-orm.config.ts                             ← the context-aware factory
└── migrations/
    └── 20240628120001-create-inbox-outbox.ts           ← shared module migrations

modules/order/src/infrastructure/database/
└── migrations/
    └── 20240628120002-create-orders.ts                 ← order module migrations

modules/inventory/src/infrastructure/database/
└── migrations/
    └── 20240628120003-create-inventory.ts              ← inventory module migrations
```

### Migration File Naming

Use **timestamp prefix** for guaranteed chronological ordering:

```
YYYYMMDDHHMMSS-<description>.ts
```

> **Rule**: Run `migration:up:shared` BEFORE any domain module migrations — shared tables
> (inbox/outbox) must exist before modules try to use them.

---

## The Config Factory (Full Source)

```typescript
// modules/shared/src/infrastructure/database/config/mikro-orm.config.ts

export default (contextName: string = 'default'): Options => {
  const isDefault = contextName === 'default';
  const moduleGlob = !isDefault ? contextName : '**';

  const migrationsPath = !isDefault
    ? `dist/${contextName}/src/infrastructure/database/migrations`
    : 'dist/shared/src/infrastructure/database/migrations';

  return {
    driver:   PostgreSqlDriver,
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    dbName:   process.env.DB_DATABASE || 'order_engine',
    user:     process.env.DB_USER     || 'order_user',
    password: process.env.DB_PASSWORD || 'order_pass',

    // Schema: auto-derived from contextName for CLI only
    // At runtime (default), entity decorators provide schema per-table
    ...(!isDefault && {
      schema: `${contextName.replace(/-/g, '_')}_schema`,
    }),

    entities:   [
      `dist/${moduleGlob}/src/domain/**/*.entity.js`,
      `dist/${moduleGlob}/src/infrastructure/database/**/*.entity.js`,
      'dist/shared/src/domain/**/*.entity.js',
    ],
    entitiesTs: [
      `modules/${moduleGlob}/src/domain/**/*.entity.ts`,
      `modules/${moduleGlob}/src/infrastructure/database/**/*.entity.ts`,
      'modules/shared/src/domain/**/*.entity.ts',
    ],

    extensions: [Migrator],
    migrations: {
      tableName: 'migrations',
      path:      migrationsPath,
      glob:      '!(*.d).{js,ts}',
      transactional: true,
      allOrNothing:  true,
    },

    debug:              process.env.NODE_ENV === 'development',
    allowGlobalContext: false,
    forceUtcTimezone:   true,
    timezone:           'UTC',
  };
};
```

---

## npm Scripts

```json
"migration:create:shared":       "npm run build && npm run mikro-orm -- migration:create --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=shared",
"migration:create:order":        "npm run build && npm run mikro-orm -- migration:create --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=order",
"migration:up:shared":           "npm run mikro-orm -- migration:up --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=shared",
"migration:up:order":            "npm run mikro-orm -- migration:up --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=order",
"migration:up":                  "npm run mikro-orm -- migration:up --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=default",
"migration:down:order":          "npm run mikro-orm -- migration:down --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=order",
"migration:status":              "npm run mikro-orm -- migration:status --config ./dist/shared/infrastructure/database/config/mikro-orm.config.js --contextName=default"
```

### Typical First-Run Sequence

```bash
# 1. Build TypeScript (CLI reads compiled .js files)
npm run build

# 2. Run shared migrations first (inbox + outbox tables in shared_schema)
npm run migration:up:shared

# 3. Run order module migration (orders table in order_schema)
npm run migration:up:order

# OR run everything at once (default context runs all)
npm run migration:up
```

---

## Environment Variables

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=order_engine
DB_USER=order_user
DB_PASSWORD=order_pass

# Per-module schemas — used by @Entity decorators for runtime query qualification
DB_SCHEMA_SHARED=shared_schema
DB_SCHEMA_ORDER=order_schema
DB_SCHEMA_INVENTORY=inventory_schema
DB_SCHEMA_PAYMENT=payment_schema
DB_SCHEMA_SHIPPING=shipping_schema
DB_SCHEMA_NOTIFICATION=notification_schema
```

---

## PostgreSQL Schema Isolation

Each module gets its own **PostgreSQL schema** within a single database:

```sql
-- shared_schema (inbox/outbox tables)
shared_schema.inbox_messages
shared_schema.outbox_messages
shared_schema.migrations          ← tracks shared migrations only

-- order_schema (order tables)
order_schema.orders
order_schema.migrations           ← tracks order migrations only
```

This gives:
- **Single DB connection** at runtime (no connection pool overhead)
- **True migration isolation** — each schema tracks its own migration history
- **Module ownership** — a module only touches its own schema

---

## Summary Table

| Aspect | Runtime | CLI Migration |
|--------|---------|---------------|
| Who calls config | `MikroOrmModule.forRoot(mikroOrmConfig)` | `npx mikro-orm migration:up` |
| `contextName` | `'default'` (explicit via root delegate) | e.g. `'order'` (via `--contextName` flag) |
| Entities discovered | ALL modules (`**` glob) | Only target module |
| Schema used | Per-entity via `process.env.DB_SCHEMA_*` | Auto-derived: `order → order_schema` |
| Purpose | Run the application | Run isolated migrations |
| Schema source | `.env` → entity decorator | contextName derivation in factory |

---

## Architectural Best Practices: event-driven-order-engine vs residency-backend

This section details key architectural decisions made in `event-driven-order-engine` compared to the legacy approach in `residency-backend`.

### 1. Explicit Custom Repositories in Entities

In **`residency-backend`**, custom repositories (e.g., `InboxMessageRepository`) were built as standard NestJS services using dependency injection (`@Injectable()`). 
* **The issue:** If a developer bypasses the injected service and calls `em.getRepository(InboxMessage)` directly using the `EntityManager`, MikroORM returns a generic repository missing all custom methods (like `storeInboxMessage()`). This can lead to unexpected runtime crashes.

In **`event-driven-order-engine`**, we use the **pure MikroORM approach**:
* We do not mark the repository with `@Injectable()` or inject `EntityManager` in its constructor.
* Instead, we bind it explicitly in the entity: `@Entity({ repository: () => InboxMessageRepository })`.
* **Why it is useful and where it is used:** This guarantees 100% type safety across the entire application. Whether a service injects the repository via `@InjectRepository()` or calls `em.getRepository(InboxMessage)` directly, MikroORM is guaranteed to return your exact custom repository class. It prevents developers from accidentally using a generic repository.

### 2. Centralized Typed Configuration (`app.config.ts`)

In **`residency-backend`**, configuration was handled simply via `ConfigModule.forRoot({ isGlobal: true })` in the `AppModule`, leaving developers to read raw environment variables (e.g., `process.env.RABBITMQ_URL`) throughout the codebase.
* **The issue:** Accessing `process.env` directly scatters configuration logic, requires manual parsing (`parseInt`), and makes it easy to fail silently or crash if a variable is missing.

In **`event-driven-order-engine`**, we use `@nestjs/config`'s `registerAs` feature in `modules/shared/src/infrastructure/config/app.config.ts`.
* **Why it is useful and where it is used:** It centralizes configuration, parses strings to numbers (e.g., `parseInt(process.env.APP_PORT)`), and provides safe defaults immediately at application startup. Anywhere in the application, services simply call `configService.get('rabbitmq.prefetchCount')` and receive a strongly-typed, guaranteed value, making tests easier and configuration changes simple.

### 3. Global Shared Module (`shared.module.ts`)

In **`residency-backend`**, there was no central place for shared infrastructure. 
* **The issue:** Feature modules had to manually re-import Database or MessageBus configuration, leading to code duplication and tight coupling.

In **`event-driven-order-engine`**, we use a `@Global()` `SharedModule` located at `modules/shared/src/shared.module.ts`.
* **Why it is useful and where it is used:** We configure the core infrastructure (Inbox/Outbox repositories, RabbitMQ Message Bus, MikroORM core) exactly **once**. Because it is marked as `@Global()`, every domain module (Order, Inventory, Payment) automatically inherits these tools without writing boilerplate setup code. This keeps domain modules clean and focused solely on business logic.
