# Project Context — AI Agent Handoff Document

> **Purpose**: This file provides full context for any AI assistant to continue working on this project. Share this file at the start of a new conversation to avoid repeating context.

**Last Updated**: 2026-06-28

---

## 1. What Is This Project?

**Resilient Event-Driven Order Fulfillment Engine** — a backend-only system built with NestJS that processes order lifecycles (place → ship) using asynchronous, event-driven communication via RabbitMQ.

It's a **modular monolith** with 5 domain modules: Order, Inventory, Payment, Shipping, Notification. Modules communicate ONLY through domain events — no direct calls.

---

## 2. Tech Stack

| Technology | Purpose |
|-----------|---------|
| NestJS 11.x | Backend framework |
| TypeScript (strict) | Language |
| MikroORM 6.x | ORM (Unit of Work + Identity Map) |
| PostgreSQL 16 | Database |
| RabbitMQ 3.x | Message broker |
| amqplib | Raw RabbitMQ client (no wrapper) |
| class-validator | DTO validation |
| @nestjs/swagger | OpenAPI documentation |
| Docker + Docker Compose | Containerization |
| Node.js 20.x Alpine | Runtime |

---

## 3. Architecture Patterns

| Pattern | How We Use It |
|---------|--------------| 
| DDD | Each module = bounded context with own entities, events, exceptions |
| Vertical Slice | Features are self-contained slices: each has its own NestJS module, controller, handler, DTO, command/query |
| CQRS | `.command.ts` for writes, `.query.ts` for reads |
| Modular Monolith | Single NestJS app, modules communicate via RabbitMQ only |
| Transactional Outbox | Events saved atomically with business data, relay publishes to RabbitMQ |
| Transactional Inbox | Message dedup using messageId + handlerName composite key |
| Choreography Saga | Each module reacts to events independently, compensates on failure |
| Message Envelope | Standard wrapper with messageId, correlationId, causationId |

---

## 4. Key Architectural Decisions

1. **MikroORM over TypeORM** — Unit of Work enables atomic outbox writes
2. **Raw amqplib over wrapper** — Full control over confirms, ACK, channels
3. **Choreography saga over orchestration** — Simpler, no extra infrastructure
4. **Topic + Fanout exchanges** — Topic for business events, Fanout for OrderCancelled
5. **Polling outbox relay** — Simple, with `SELECT FOR UPDATE SKIP LOCKED`
6. **class-validator DTOs** — Native NestJS integration
7. **Per-module PostgreSQL schemas** — Each module is isolated in its own schema (`order_schema`, `shared_schema`, etc.). See `docs/06-migration-strategy.md`.
8. **Entity-level schema (Option A)** — Schema declared on each `@Entity` via `process.env.DB_SCHEMA_*` for runtime query qualification. MikroORM CLI derives schema from `contextName` for migrations.

---

## 5. Project Structure

```
modules/
  main.ts
  app.module.ts
  shared/            # Cross-cutting infrastructure (message bus, inbox/outbox, config, exceptions)
    src/
      domain/
      infrastructure/
      shared.module.ts
    test/
    openapi.yml
    asyncapi.yml
  order/             # Order domain module
    src/
      domain/
      features/
      infrastructure/
    test/
    openapi.yml
    asyncapi.yml
  inventory/         # Inventory domain module (Phase 4)
  payment/           # Payment domain module (Phase 5)
  shipping/          # Shipping domain module (Phase 6)
  notification/      # Notification domain module (Phase 7)
docs/                # Project documentation
mikro-orm.config.ts  # Root delegate → calls shared config factory with contextName='default'
```

### Module Internal Structure (applies to every domain module)

```
modules/<module>/
├── openapi.yml                            ← OpenAPI endpoints documentation
├── asyncapi.yml                           ← AsyncAPI event contracts
├── test/                                  ← Unit and integration tests for this module
└── src/
    ├── domain/
    │   └── <entity>/
    │       ├── <entity>.entity.ts             ← MikroORM entity with schema: process.env.DB_SCHEMA_<MODULE>
    │       ├── enum/
    │       │   └── <entity>-status.enum.ts    ← TypeScript enum
    │       └── enum-mapper/
    │           └── <entity>-status-mapper.ts  ← MikroORM Type: enum ↔ integer in DB
    │   ├── events/
    │   │   └── <event>.event.ts               ← Domain event implementing DomainEvent<TPayload>
    │   └── exceptions/
    │       └── exceptions.ts                  ← Domain exceptions (e.g. OrderNotFoundException)
    ├── features/
    │   ├── order.module.ts                    ← Aggregating NestJS module (imports all feature slices)
    │   └── <feature>/
    │       ├── <feature>.module.ts            ← Self-contained NestJS module for this slice
    │       ├── <feature>.controller.ts        ← HTTP controller (@Controller, @Post, @Get, etc.)
    │       ├── <feature>.dto.ts               ← class-validator DTO (HTTP input validation)
    │       ├── <feature>.command.ts           ← Immutable command/query class (CQRS)
    │       └── <feature>.handler.ts           ← Business logic, transactional outbox writes
    └── infrastructure/
        ├── database/
        │   └── migrations/                    ← Module-specific MikroORM migrations
        ├── http/
        │   └── exceptions/
        │       ├── mappers.ts                 ← Maps domain exceptions → HTTP ProblemDetails
        │       └── registry.ts               ← Registers mappers with the global exception filter
        ├── repository/
        │   └── <entity>.repository.ts        ← MikroORM EntityRepository wrapper class
        └── processor/                         ← (Phase 4+) event consumer handlers
```

### Shared Module Structure

```
modules/shared/
├── openapi.yml
├── asyncapi.yml
├── test/
└── src/
    ├── domain/
    │   ├── base.entity.ts                     ← BaseEntity (id, createdAt, updatedAt)
    │   ├── common/                            ← Interfaces: DomainEvent, Command, Query, MessageEnvelope
    │   ├── inbox/
    │   │   └── inbox-message.entity.ts        ← schema: process.env.DB_SCHEMA_SHARED
    │   └── outbox/
    │       └── outbox-message.entity.ts       ← schema: process.env.DB_SCHEMA_SHARED
    ├── infrastructure/
    │   ├── config/
    │   │   └── app.config.ts                  ← Typed env config (appConfig, databaseConfig, rabbitmqConfig, outboxConfig)
    │   ├── database/
    │   │   ├── config/
    │   │   │   └── mikro-orm.config.ts        ← Context-aware MikroORM factory (CLI + runtime)
    │   │   └── migrations/                    ← Shared migrations (inbox/outbox tables)
    │   ├── repository/
    │   │   ├── inbox/inbox-message.repository.ts
    │   │   └── outbox/outbox-message.repository.ts
    │   ├── message-bus/rabbitmq/              ← RabbitMQ connection, producer, consumer, configurer
    │   └── http/exceptions/                   ← Global exception filter + mapper registry
    └── shared.module.ts                       ← @Global() module providing repos, lazy handler, message bus
```

---

## 6. Reference Documentation

| Document | Path | Contents |
|----------|------|----------|
| PRD | `docs/01-product-requirements.md` | Features, user stories, MVP scope |
| TRD | `docs/02-technical-requirements.md` | Stack decisions, architecture, project structure |
| App Flow | `docs/03-app-flow.md` | All API endpoints, event flows, saga compensation |
| Backend Schema | `docs/04-backend-schema.md` | All DB tables, columns, indexes, relationships |
| Implementation Plan | `docs/05-implementation-plan.md` | 10-phase build plan with deliverables |
| Migration Strategy | `docs/06-migration-strategy.md` | Per-module schema isolation, context-aware config, all migration commands |
| RabbitMQ Setup | `docs/rabbitmq-setup.md` | Full RabbitMQ architecture, topology, flow diagrams |
| Concepts Deep Dive | `docs/concepts-deep-dive.md` | DDD, CQRS, RabbitMQ, Outbox, Docker explanations |

---

## 7. Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Project Setup | ✅ Done | Docker, NestJS, MikroORM, CORS, env config |
| 2. Shared Infrastructure | ✅ Done | Outbox/Inbox entities + repos, message bus, exceptions |
| 3. Order Module | 🔄 In Progress | First domain module — Place Order done, next: domain exceptions, OrderRepository, GetOrder, ListOrders, CancelOrder, migration |
| 4. Inventory Module | ⬜ Not Started | First inter-module flow |
| 5. Payment Module | ⬜ Not Started | Saga trigger point |
| 6. Shipping Module | ⬜ Not Started | Near-complete flow |
| 7. Notification Module | ⬜ Not Started | Full flow |
| 8. Saga & Compensation | ⬜ Not Started | Failure handling |
| 9. Retry & DLQ | ⬜ Not Started | Resilience |
| 10. Docs & Polish | ⬜ Not Started | OpenAPI, AsyncAPI, seed data |

---

## 8. Important Conventions

- **File naming**: kebab-case (`place-order.handler.ts`)
- **Commands**: imperative (`PlaceOrderCommand`) in `.command.ts`
- **Queries**: interrogative (`GetOrderQuery`) in `.query.ts`
- **DTOs**: `.dto.ts` with class-validator decorators
- **Events**: past tense (`OrderPlacedEvent`) in `.event.ts`
- **Controllers**: `.controller.ts` (NOT `.route.ts`)
- **Feature modules**: each feature slice has its own `<feature>.module.ts`
- **Aggregating module**: `modules/<module>/src/features/order.module.ts` named `OrderModule` imports all feature slices
- **Enum mappers**: in `domain/<entity>/enum-mapper/` — maps enum ↔ integer in DB
- **Processors**: `handle-{event-name}.processor.ts` (Phase 4+)
- **No cross-module DB queries** — events only
- **Outbox pattern**: in handlers use `em.transactional()` to persist entity + `OutboxMessage` atomically
- **Inbox dedup key**: `messageId + handlerName`
- **Schema naming**: singular (`order_schema` not `orders_schema`), matching folder name

---

## 9. Migration Commands

```bash
# Build first (CLI reads compiled .js)
npm run build

# Per-module migration
npm run migration:up:shared       # shared_schema (inbox/outbox) — run FIRST
npm run migration:up:order        # order_schema (orders table)
npm run migration:up              # run ALL modules at once

# Create a new migration for a module
npm run migration:create:order
npm run migration:create:shared
```

See `docs/06-migration-strategy.md` for the complete strategy.

---

## 10. Docker Commands

```bash
docker compose up -d                          # Start all services
docker compose exec backend sh                # Enter backend container
docker compose exec backend npm run migration:up:shared  # Run shared migrations
docker compose exec backend npm run migration:up:order   # Run order migrations
docker compose exec backend npm run setup:message-bus    # Setup RabbitMQ topology
docker compose logs -f backend                # View logs
```

---

## 11. Current Status

- **Current Phase**: Phase 3 — Order Module (In Progress)
- **Last Completed**:
  - Phase 2 (Shared Infrastructure) — complete
  - Migration strategy setup — complete (`docs/06-migration-strategy.md`)
  - Order entity, OrderStatus enum, OrderStatusMapper — complete
  - Place Order feature slice (DTO → Command → Handler → Controller → Module) — complete
  - `OrderModule` in `features/order.module.ts` — complete
- **Next Step**: Step 3.3 — Domain exceptions (`OrderNotFoundException`, `InvalidOrderStateException`) → then `OrderRepository` → then `GetOrder` and `ListOrders` feature slices

---

## 12. AI Agent Execution Guidelines (CRITICAL)

The user is learning these concepts (Event-Driven Architecture, MikroORM, CQRS, RabbitMQ) for the first time. You **MUST** strictly follow these rules during implementation:

1. **Explain What, Why, and How**: Before writing code for a new component or concept, explicitly explain:
   - **What** it is.
   - **Why** we need it (the best practice rationale).
   - **How** we are going to implement it and where the files belong.
2. **Break Down Large Phases**: Do not attempt to complete an entire large phase in one go. Break it down into smaller, digestible steps.
3. **Be Proactive with Education**: Explain architectural decisions, folder structure rules, and ORM behaviors (like Unit of Work) as they are used.
4. **Step-by-Step Approval**: Implement a small chunk, explain it, verify it works, and ask the user to proceed to the next chunk.
5. **Always verify with `npm run build`** after each implementation step.
