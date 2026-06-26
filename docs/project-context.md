# Project Context — AI Agent Handoff Document

> **Purpose**: This file provides full context for any AI assistant to continue working on this project. Share this file at the start of a new conversation to avoid repeating context.

**Last Updated**: 2026-06-25

---

## 1. What Is This Project?

**Resilient Event-Driven Order Fulfillment Engine** — a backend-only system built with NestJS that processes order lifecycles (place → ship) using asynchronous, event-driven communication via RabbitMQ.

It's a **modular monolith** with 5 domain modules: Order, Inventory, Payment, Shipping, Notification. Modules communicate ONLY through domain events — no direct calls.

---

## 2. Tech Stack

| Technology | Purpose |
|-----------|---------|
| NestJS 10.x | Backend framework |
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
| DDD | Each module = bounded context with own entities, events |
| Vertical Slice | Features organized as self-contained folders (command + handler + DTO + route) |
| CQRS | Separate .command.ts (writes) and .query.ts (reads) |
| Modular Monolith | Single NestJS app, modules communicate via RabbitMQ |
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
7. **Single DB, module-prefixed tables** — Modules own their tables, no cross-module queries

---

## 5. Project Structure

```
src/
  shared/            # Infrastructure: message bus, outbox/inbox, exceptions, config
  order/             # Order domain module
  inventory/         # Inventory domain module
  payment/           # Payment domain module
  shipping/          # Shipping domain module
  notification/      # Notification domain module
docs/                # Project documentation
migrations/          # MikroORM migrations
```

Each module follows:
```
module-name/
  asyncapi.yaml
  module-name.module.ts
  src/
    domain/entities/, enums/, events/, exceptions/
    features/feature-name/(command|query).ts, handler.ts, route.ts, dto.ts
    infrastructure/message-bus/, processors/, http/exceptions/
```

---

## 6. Reference Documentation

| Document | Path | Contents |
|----------|------|----------|
| Concepts Deep Dive | `concepts-deep-dive.md` | All concepts explained (DDD, CQRS, RabbitMQ, Outbox, Docker, etc.) |
| PRD | `docs/01-product-requirements.md` | Features, user stories, MVP scope |
| TRD | `docs/02-technical-requirements.md` | Stack decisions, architecture, project structure |
| App Flow | `docs/03-app-flow.md` | All API endpoints, event flows, saga compensation |
| Backend Schema | `docs/04-backend-schema.md` | All DB tables, columns, indexes, relationships |
| Implementation Plan | `docs/05-implementation-plan.md` | 10-phase build plan with deliverables |

---

## 7. Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Project Setup | ✅ Completed | Docker, NestJS, MikroORM, CORS |
| 2. Shared Infrastructure | ✅ Completed | Outbox/Inbox, message bus, exceptions |
| 3. Order Module | ⬜ Not Started | First domain module |
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
- **Processors**: `handle-{event-name}.processor.ts`
- **No cross-module DB queries** — events only
- **All commands use `em.flush()`** for atomic outbox writes
- **Inbox dedup key**: `messageId + handlerName`

---

## 9. Docker Commands

```bash
docker compose up -d                          # Start all
docker compose exec backend sh                # Enter container
docker compose exec backend npm run migration:up  # Run migrations
docker compose exec backend npm run setup:message-bus  # Setup RabbitMQ
docker compose logs -f backend                # View logs
```

---

## 10. Current Status

- **Current Phase**: Phase 3 (Order Module)
- **Last Completed**: Phase 2 (Shared Infrastructure) complete
- **Next Step**: Phase 3 — Implement the first domain module (Order Module)

---

## 11. AI Agent Execution Guidelines (CRITICAL)

The user is learning these concepts (Event-Driven Architecture, MikroORM, CQRS, RabbitMQ) for the first time. You **MUST** strictly follow these rules during implementation:

1. **Explain What, Why, and How**: Before writing code for a new component or concept, explicitly explain:
   - **What** it is.
   - **Why** we need it (the best practice rationale).
   - **How** we are going to implement it and where the files belong.
2. **Break Down Large Phases**: Do not attempt to complete an entire large phase in one go. Break it down into smaller, digestible steps (e.g., "Step 1: Outbox Entity", "Step 2: Message Bus Wrapper").
3. **Be Proactive with Education**: Explain architectural decisions, folder structure rules, and ORM behaviors (like Unit of Work) as they are used. Do not wait for the user to ask.
4. **Step-by-Step Approval**: Implement a small chunk, explain it, verify it works, and ask the user to proceed to the next chunk.
