# Technical Requirements Document (TRD)

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.0 | **Last Updated**: 2026-06-25

---

## 1. Technology Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| Runtime | Node.js | 20.x (Alpine) | LTS, stable, TypeScript support |
| Language | TypeScript | 5.x (strict) | Type safety, better DX |
| Framework | NestJS | 10.x | Built-in DI, modules, guards, pipes — perfect for modular monolith |
| ORM | MikroORM | 6.x | Unit of Work + Identity Map — atomic outbox writes |
| Database | PostgreSQL | 16.x | JSONB, robust transactions, SKIP LOCKED |
| Message Broker | RabbitMQ | 3.x | Topic/fanout exchanges, DLQ, management UI |
| RabbitMQ Client | amqplib | latest | Raw control over channels, confirms, ACK/NACK |
| Validation | class-validator + class-transformer | latest | DTO validation with decorators |
| API Docs | @nestjs/swagger | latest | Auto-generated OpenAPI from decorators |
| Containerization | Docker + Docker Compose | latest | Consistent dev/prod environment |
| Process Manager | dumb-init | latest | Proper signal forwarding in containers |

---

## 2. Architecture Overview

### 2.1 Architecture Style

**Modular Monolith** with **DDD Bounded Contexts** and **Vertical Slice Architecture**.

- Single deployable unit (one NestJS application)
- 5 independent domain modules + shared infrastructure
- Modules communicate ONLY through RabbitMQ events (no direct imports for business logic)
- Each module can be extracted as a microservice later with zero business logic changes

### 2.2 Patterns Used

| Pattern | Purpose |
|---------|---------|
| DDD (Domain-Driven Design) | Organize code by business domains |
| Vertical Slice Architecture | Each feature is self-contained (handler + route + DTO + validation) |
| CQRS | Separate commands (writes) from queries (reads) |
| Transactional Outbox | Reliable event publishing — atomic with business data |
| Transactional Inbox | Idempotent message processing — exactly-once semantics |
| Choreography Saga | Distributed compensation without central orchestrator |
| Message Envelope | Standard wrapper with correlation/causation tracing |
| Repository Pattern | Abstract data access behind interfaces |

### 2.3 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Environment                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   NestJS Application                      │  │
│  │                                                          │  │
│  │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────┐│  │
│  │  │ Order  │ │Inventory │ │ Payment │ │Shipping│ │Notif││  │
│  │  │ Module │ │  Module  │ │ Module  │ │ Module │ │Mod. ││  │
│  │  └───┬────┘ └────┬─────┘ └────┬────┘ └───┬────┘ └──┬──┘│  │
│  │      │           │            │           │         │    │  │
│  │  ┌───┴───────────┴────────────┴───────────┴─────────┴──┐│  │
│  │  │          Shared Infrastructure Layer                 ││  │
│  │  │  (Message Bus, Outbox Relay, Inbox Handler, HTTP)    ││  │
│  │  └──────────────────────┬───────────────────────────────┘│  │
│  └─────────────────────────┼────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────┐  ┌───┴──────────────┐                    │
│  │  PostgreSQL 16   │  │   RabbitMQ 3.x   │                    │
│  │  ┌────────────┐  │  │  ┌────────────┐  │                    │
│  │  │orders      │  │  │  │ Exchanges  │  │                    │
│  │  │products    │  │  │  │ Queues     │  │                    │
│  │  │payments    │  │  │  │ DLQ        │  │                    │
│  │  │shipments   │  │  │  └────────────┘  │                    │
│  │  │notifications│ │  │                  │                    │
│  │  │outbox_msgs │  │  │  Management UI   │                    │
│  │  │inbox_msgs  │  │  │  :15672          │                    │
│  │  └────────────┘  │  └──────────────────┘                    │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
event-driven-order-engine/
├── docker-compose.yml
├── docker-compose.dev.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── mikro-orm.config.ts
├── .env
├── .env.example
├── docs/
│   ├── 01-product-requirements.md
│   ├── 02-technical-requirements.md
│   ├── 03-app-flow.md
│   ├── 04-backend-schema.md
│   ├── 05-implementation-plan.md
│   └── project-context.md
├── modules/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── shared/
│   │   ├── openapi.yml
│   │   ├── asyncapi.yml
│   │   ├── test/
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── common/
│   │       │   │   ├── base.entity.ts
│   │       │   │   ├── domain-event.interface.ts
│   │       │   │   ├── command.interface.ts
│   │       │   │   ├── query.interface.ts
│   │       │   │   └── message-envelope.interface.ts
│   │       │   ├── outbox-message/
│   │       │   │   ├── outbox-message.entity.ts
│   │       │   │   └── outbox-message.repository.ts
│   │       │   └── inbox-message/
│   │       │       ├── inbox-message.entity.ts
│   │       │       └── inbox-message.repository.ts
│   │       │
│   │       └── infrastructure/
│   │           ├── message-bus/
│   │           │   ├── rabbitmq/
│   │           │   │   ├── config/
│   │           │   │   │   ├── rabbitmq.config.ts
│   │           │   │   │   └── rabbitmq-connection.service.ts
│   │           │   │   ├── producer/
│   │           │   │   │   └── rabbitmq-producer.service.ts
│   │           │   │   └── consumer/
│   │           │   │       └── rabbitmq-consumer.service.ts
│   │           │   ├── cli-commands/
│   │           │   │   └── setup-message-bus.command.ts
│   │           │   ├── message-destination-registry.ts
│   │           │   ├── outbox-message-relay.service.ts
│   │           │   ├── inbox-message-handler.service.ts
│   │           │   └── lazy-load-handler.service.ts
│   │           │
│   │           ├── http/
│   │           │   └── exceptions/
│   │           │       ├── all-exception.filter.ts
│   │           │       ├── exceptions.ts
│   │           │       ├── registry.ts
│   │           │       └── strategy.ts
│   │           │
│   │           ├── database/
│   │           │   └── mikro-orm.module.ts
│   │           │
│   │           └── config/
│   │               ├── app.config.ts
│   │               └── cors.config.ts
│   │
│   ├── order/
│   │   ├── openapi.yml
│   │   ├── asyncapi.yml
│   │   ├── test/
│   │   └── src/
│   │       ├── domain/
│   │       │   └── order/
│   │       │       ├── order.entity.ts
│   │       │       ├── enum/
│   │       │       │   └── order-status.enum.ts
│   │       │       ├── enum-mapper/
│   │       │       │   └── order-status-mapper.ts
│   │       │       ├── events/
│   │       │       │   ├── order-placed.event.ts
│   │       │       │   └── order-cancelled.event.ts
│   │       │       └── exceptions/
│   │       │           └── order.exceptions.ts
│   │       ├── features/
│   │       │   ├── order.module.ts
│   │       │   ├── place-order/
│   │       │   │   ├── place-order.command.ts
│   │       │   │   ├── place-order.handler.ts
│   │       │   │   ├── place-order.controller.ts
│   │       │   │   ├── place-order.dto.ts
│   │       │   │   └── place-order.module.ts
│   │       │   ├── get-order/
│   │       │   │   ├── get-order.query.ts
│   │       │   │   ├── get-order.handler.ts
│   │       │   │   └── get-order.controller.ts
│   │       │   ├── list-orders/
│   │       │   │   ├── list-orders.query.ts
│   │       │   │   ├── list-orders.handler.ts
│   │       │   │   └── list-orders.controller.ts
│   │       │   └── cancel-order/
│   │       │       ├── cancel-order.command.ts
│   │       │       ├── cancel-order.handler.ts
│   │       │       └── cancel-order.controller.ts
│   │       └── infrastructure/
│   │           ├── database/
│   │           │   └── migrations/
│   │           ├── message-bus/
│   │           │   ├── order.message-destination.ts
│   │           │   └── order.message-destination.module.ts
│   │           ├── processors/
│   │           │   ├── payment-completed/
│   │           │   ├── payment-failed/
│   │           │   ├── shipment-created/
│   │           │   └── signature.types.service.ts
│   │           └── http/
│   │               └── exceptions/
│   │                   ├── registry.ts
│   │                   └── mappers.ts
│   │
│   ├── inventory/
│   │   ├── openapi.yml
│   │   ├── asyncapi.yml
│   │   ├── test/
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── product/
│   │       │   │   ├── product.entity.ts
│   │       │   │   ├── events/
│   │       │   │   └── exceptions/
│   │       │   └── reservation/
│   │       │       ├── inventory-reservation.entity.ts
│   │       │       ├── enum/
│   │       │       ├── enum-mapper/
│   │       │       ├── events/
│   │       │       └── exceptions/
│   │       ├── features/
│   │       │   ├── inventory.module.ts
│   │       │   ├── add-product/
│   │       │   ├── get-product/
│   │       │   ├── list-products/
│   │       │   └── update-stock/
│   │       └── infrastructure/
│   │           ├── database/
│   │           │   └── migrations/
│   │           ├── message-bus/
│   │           │   ├── inventory.message-destination.ts
│   │           │   └── inventory.message-destination.module.ts
│   │           ├── processors/
│   │           │   ├── order-placed/
│   │           │   ├── order-cancelled/
│   │           │   └── signature.types.service.ts
│   │           └── http/
│   │               └── exceptions/
│   │                   ├── registry.ts
│   │                   └── mappers.ts
│   │
│   ├── payment/
│   │   ├── openapi.yml
│   │   ├── asyncapi.yml
│   │   ├── test/
│   │   └── src/...
│   │
│   ├── shipping/
│   │   ├── openapi.yml
│   │   ├── asyncapi.yml
│   │   ├── test/
│   │   └── src/...
│   │
│   └── notification/
│       ├── openapi.yml
│       ├── asyncapi.yml
│       ├── test/
│       └── src/...
│
└── migrations/
```

---

## 4. Database Strategy

| Aspect | Decision |
|--------|----------|
| ORM | MikroORM with Unit of Work |
| Migrations | MikroORM CLI migrations |
| Schema | Single database, module-prefixed tables |
| Transactions | All command handlers use `em.flush()` (atomic) |
| Outbox queries | `SELECT ... FOR UPDATE SKIP LOCKED` for concurrent relay safety |
| UUID strategy | `gen_random_uuid()` at DB level |
| JSONB | Used for event payloads, order items |

---

## 5. Messaging Strategy

### 5.1 Exchange Architecture

| Exchange | Type | Purpose |
|----------|------|---------|
| `order-exchange` | Topic | Routes Order module events |
| `inventory-exchange` | Topic | Routes Inventory module events |
| `payment-exchange` | Topic | Routes Payment module events |
| `shipping-exchange` | Topic | Routes Shipping module events |
| `order-cancelled-fanout` | Fanout | Broadcasts OrderCancelled to ALL modules |
| `retry-exchange` | Topic | Routes failed messages for delayed retry |
| `dlx-exchange` | Topic | Routes permanently failed messages to DLQ |

### 5.2 Queue Architecture

| Queue | Bound To | Binding Key |
|-------|----------|----------------|
| `inventory.order-events` | order-exchange | `order.events.#` |
| `payment.inventory-events` | inventory-exchange | `inventory.events.inventory-reserved` |
| `order.payment-events` | payment-exchange | `payment.events.#` |
| `shipping.payment-events` | payment-exchange | `payment.events.payment-completed` |
| `shipping.order-cancelled` | order-cancelled-fanout | (none — fanout) |
| `inventory.order-cancelled` | order-cancelled-fanout | (none — fanout) |
| `payment.order-cancelled` | order-cancelled-fanout | (none — fanout) |
| `notification.all-events` | all exchanges | `#` (all events) |
| `retry.{module}` | retry-exchange | Delayed retry with TTL |
| `dlq.{module}` | dlx-exchange | Permanent failure capture |

### 5.3 Reliability Configuration

| Setting | Value | Why |
|---------|-------|-----|
| Durable exchanges | `true` | Survive broker restart |
| Durable queues | `true` | Survive broker restart |
| Persistent messages | `deliveryMode: 2` | Messages written to disk |
| Publisher confirms | Enabled | Producer knows if broker received message |
| Manual ACK | `noAck: false` | Consumer controls when message is removed |
| Prefetch | `1` | Process one message at a time |
| Retry TTL | `1000, 2000, 4000, 8000, 16000` ms | Exponential backoff |
| Max retries | `5` | Then → DLQ |

---

## 6. Docker Strategy

### 6.1 Containers

| Service | Image | Ports |
|---------|-------|-------|
| backend | Custom (multi-stage build) | 8080 |
| postgres | postgres:16-alpine | 5432 |
| rabbitmq | rabbitmq:3-management-alpine | 5672, 15672 |

### 6.2 Development Workflow

```bash
# Start all services
docker compose up -d

# Enter backend container
docker compose exec backend sh

# Run migrations inside container
docker compose exec backend npm run migration:up

# Setup RabbitMQ exchanges/queues
docker compose exec backend npm run setup:message-bus

# View logs
docker compose logs -f backend

# Restart only backend
docker compose restart backend
```

### 6.3 Docker Compose (Dev) Additions

For development, we'll use a `docker-compose.dev.yml` override with:
- Volume mounting source code for hot-reload
- `npm run start:dev` instead of production CMD
- Debug port exposed (9229)

---

## 7. API Documentation Strategy

### 7.1 OpenAPI (Swagger)

- Auto-generated from NestJS decorators (`@ApiProperty`, `@ApiTags`, `@ApiOperation`)
- Available at `http://localhost:8080/api/docs`
- Includes request/response schemas, status codes, examples
- Grouped by module tags

### 7.2 AsyncAPI

- One `asyncapi.yaml` per module
- Documents all published and consumed events
- Includes payload schemas with examples
- Serves as the async contract between modules

---

## 8. Error Handling Strategy

### 8.1 HTTP Error Format (RFC 7807 ProblemDetails)

```json
{
  "type": "https://api.order-engine.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order with ID '123' does not exist",
  "instance": "/api/orders/123"
}
```

### 8.2 Error Mapping

| Domain Error | HTTP Status |
|-------------|-------------|
| EntityNotFoundError | 404 Not Found |
| InvalidStateTransitionError | 409 Conflict |
| InsufficientStockError | 409 Conflict |
| ValidationError (DTO) | 400 Bad Request |
| Unknown/Unhandled | 500 Internal Server Error |

### 8.3 Architecture

```
Domain throws BusinessError
  → AllExceptionsFilter catches it
  → MappingStrategy finds registered mapper
  → Mapper converts to ProblemDetails response
  → Returns consistent JSON
```

---

## 9. Security Requirements (V1)

| Aspect | Implementation |
|--------|---------------|
| CORS | Configured in NestJS — allow specific origins |
| Input Validation | class-validator DTOs with global ValidationPipe |
| SQL Injection | Prevented by MikroORM parameterized queries |
| Non-root container | Docker USER node |
| Env secrets | `.env` file (not committed to git) |
| No auth in V1 | API is open — auth planned for V2 |

---

## 10. Technical Decisions Log

| Decision | Chosen | Alternative | Reason |
|----------|--------|-------------|--------|
| ORM | MikroORM | TypeORM, Drizzle | Unit of Work = atomic outbox writes |
| RMQ Client | raw amqplib | @golevelup/nestjs-rabbitmq | Full control over confirms, ACK, channels |
| Saga Style | Choreography | Orchestration (Temporal) | Simpler, no extra infrastructure |
| Exchange | Topic + Fanout | Direct only | Flexible routing + broadcast capability |
| Outbox Relay | Polling | CDC (Debezium) | Simpler setup, sufficient throughput |
| Validation | class-validator DTOs | Zod | NestJS native integration, decorators |
| DB | PostgreSQL | MySQL, MongoDB | JSONB, SKIP LOCKED, robust transactions |
| Container | Docker multi-stage | Plain Dockerfile | Smaller image, security (non-root) |
| CQRS | Light CQRS (files only) | Full CQRS (separate DBs) | Appropriate complexity for single DB |
