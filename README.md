# Resilient Event-Driven Order Fulfillment Engine

A production-grade modular monolith backend order fulfillment engine built with **Domain-Driven Design (DDD)** and **Vertical Slice Architecture**. The system processes orders asynchronously across modules via domain events, using a resilient RabbitMQ messaging topology with Transactional Inbox/Outbox patterns.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Compose Environment                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    NestJS Application                       │  │
│  │                                                            │  │
│  │   ┌────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐  │  │
│  │   │ Order  │  │Inventory │  │ Payment │  │  Shipping  │  │  │
│  │   │ Module │  │  Module  │  │ Module  │  │   Module   │  │  │
│  │   └───┬────┘  └────┬─────┘  └────┬────┘  └─────┬──────┘  │  │
│  │       │            │             │              │          │  │
│  │   ┌───┴────────────┴─────────────┴──────────────┴───────┐ │  │
│  │   │         Shared Infrastructure Layer                  │ │  │
│  │   │   Message Bus · Outbox Relay · Inbox Handler · HTTP  │ │  │
│  │   └──────────────────────┬───────────────────────────────┘ │  │
│  └──────────────────────────┼─────────────────────────────────┘  │
│                             │                                     │
│   ┌─────────────────┐  ┌───┴──────────────┐  ┌───────────────┐  │
│   │  PostgreSQL 16   │  │   RabbitMQ 3.x   │  │  Notification │  │
│   └─────────────────┘  └──────────────────┘  │    Module     │  │
│                                               └───────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

The application is structured so that each bounded context is isolated into its own Postgres schema (`order_schema`, `inventory_schema`, etc.) and communicates exclusively through events. This ensures that any module can later be seamlessly decoupled into microservices.

---

## 2. Tech Stack

- **Framework**: NestJS (Modular Architecture, dependency injection)
- **Database**: PostgreSQL 16 (Multi-schema isolation, `SELECT FOR UPDATE SKIP LOCKED` for concurrency)
- **ORM**: MikroORM (Unit of Work, identity map, migrations, schema Isolation)
- **Message Broker**: RabbitMQ 3.x (Pub/Sub via Topic Exchanges, Dead-Letter Queues, Retries)
- **Runtime**: TypeScript & Node.js

---

## 3. Quick Start Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Setup & Run
1. **Clone and Configure**:
   ```bash
   cp .env.example .env
   ```
2. **Boot Services**:
   ```bash
   docker compose up -d
   ```
3. **Execute Migrations**:
   ```bash
   docker compose exec backend npm run migration:up
   ```
4. **Seed Mock Products & Data (Idempotent)**:
   ```bash
   docker compose exec backend npm run db:seed
   ```
5. **Start Dev Server**:
   ```bash
   docker compose restart backend
   ```

---

## 4. Message Bus CLI Commands

The system features dedicated CLI commands to manage event dispatching and consumption on a per-bounded-context module basis:

### Outbox Dispatcher (Producer)
To poll the transactional outbox table of a specific module and publish pending messages:
```bash
npm run rabbitmq:dispatch -- --module=<module_name>
```
*Example (Order module):*
```bash
npm run rabbitmq:dispatch -- --module=order
```

### Event Consumer (Consumer)
To run the background event listener process that handles incoming messages for a module:
```bash
npm run rabbitmq:consume -- --module=<module_name>
```
*Example (Order module):*
```bash
npm run rabbitmq:consume -- --module=order
```

**Available Modules**: `order`, `inventory`, `payment`, `shipping`, `notification`

---

## 5. Development & Testing Commands

```bash
docker compose logs -f backend   # View application logs
npm run test:e2e                 # Run full E2E & Resilience integration test suite
npm run build                    # Compile NestJS application
npm run lint                     # Run ESLint validation
```

---

## 6. Access Points

| Service | Address | Credentials |
|---------|---------|-------------|
| **Backend HTTP Port** | http://localhost:8082 | — |
| **Health Check Endpoint** | http://localhost:8082/api/health | — |
| **RabbitMQ Management Dashboard** | http://localhost:15672 | `guest` / `guest` |

---

## 7. Technical Documentation Links

For deeper architectural breakdowns, see:
- [Product Requirements](./docs/01-product-requirements.md)
- [Technical Requirements](./docs/02-technical-requirements.md)
- [App Flow & Endpoints](./docs/03-app-flow.md)
- [Database Schema Layout](./docs/04-backend-schema.md)
- [10-Phase Implementation Roadmap](./docs/05-implementation-plan.md)
- [Choreography Saga & Event Flows](./docs/08-event-flow-saga-map.md)
- [Websocket Real-Time Updates](./docs/websocket-setup.md)