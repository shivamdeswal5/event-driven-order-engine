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
│   │  PostgreSQL 16   │  │   RabbitMQ 4.x   │  │  Notification │  │
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
- **Message Broker**: RabbitMQ 3.x/4.x (Pub/Sub via Topic Exchanges, Dead-Letter Queues, Retries)
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
2. **Boot Database & RabbitMQ Services**:
   ```bash
   docker compose up -d
   ```
3. **Execute Migrations (All Schemas)**:
   You can run migrations inside the container for all modules:
   ```bash
   docker compose exec backend npm run migration:up:shared
   docker compose exec backend npm run migration:up:order
   docker compose exec backend npm run migration:up:inventory
   docker compose exec backend npm run migration:up:payment
   docker compose exec backend npm run migration:up:shipping
   docker compose exec backend npm run migration:up:notification
   ```
   Or on the host machine:
   ```bash
   DB_HOST=localhost npm run migration:up:shared
   DB_HOST=localhost npm run migration:up:order
   DB_HOST=localhost npm run migration:up:inventory
   DB_HOST=localhost npm run migration:up:payment
   DB_HOST=localhost npm run migration:up:shipping
   DB_HOST=localhost npm run migration:up:notification
   ```
4. **Seed Mock Products & Data**:
   Inside the container:
   ```bash
   docker compose exec backend npm run seed:run:inventory
   ```
   Or on the host machine:
   ```bash
   DB_HOST=localhost npm run seed:run:inventory
   ```
5. **Start Dev Server**:
   You can start the NestJS dev server on the host machine (recommended for local development):
   ```bash
   DB_HOST=localhost RABBITMQ_URL=amqp://deswal:deswal@localhost:5672 npm run start:dev
   ```

---

## 4. How to Test the Event Saga

To test the entire order fulfillment saga, you need to:
1. **Start all background consumers** first. This ensures that all RabbitMQ exchanges, queues, and bindings are declared so no published messages are lost.
2. **Hit the API endpoints** to place orders, and then **dispatch the outbox messages** to move the saga forward.

### Step 1: Start Consumers
Open separate terminal tabs to start the consumers for each context:
```bash
npm run handle-messages -- --module=order
npm run handle-messages -- --module=inventory
npm run handle-messages -- --module=payment
npm run handle-messages -- --module=shipping
npm run handle-messages -- --module=notification
```

### Step 2: Make API Requests
We have provided a Postman collection at the root of the project to trigger endpoints:
- **`postman_collection.json`**: Import this file directly into **Postman** or **Thunder Client** to load pre-configured endpoints.

1. List available products (GET `/api/products`) to find a product ID and its stock.
2. Place an order (POST `/api/orders`) using that product ID. This creates the order record and stores the `OrderPlaced` event in the transactional outbox.

### Step 3: Run the Outbox Dispatchers
To publish the events from the outbox to RabbitMQ, run the dispatcher commands:

#### Option A: One-by-One Step Execution (Recommended for Debugging)
Run each dispatcher manually to step through the saga and observe the database change state in PGAdmin:
```bash
npm run dispatch-messages -- --module=order
npm run dispatch-messages -- --module=inventory
npm run dispatch-messages -- --module=payment
npm run dispatch-messages -- --module=shipping
```

#### Option B: Continuous Polling Mode
Run the dispatchers with the `--continuous` flag to automatically relay messages in a loop:
```bash
npm run dispatch-messages -- --module=order --continuous
npm run dispatch-messages -- --module=inventory --continuous
npm run dispatch-messages -- --module=payment --continuous
npm run dispatch-messages -- --module=shipping --continuous
```

### 4.3 CLI Options & Queue Overrides (Advanced)
Both `handle-messages` and `dispatch-messages` support advanced parameters to override queue topology, exchange types, message TTL, and retry policies at runtime:

```bash
npm run handle-messages -- \
  --module=order \
  --limit=20 \
  --primary-queue=order.custom-queue \
  --primary-queue-exchange=order-topic \
  --primary-queue-exchange-type=topic \
  --retry-queue=order.custom-queue-retry \
  --retry-queue-binding-key=order.custom-queue-retry \
  --retry-queue-exchange=order-direct \
  --retry-queue-exchange-type=direct \
  --retry-queue-message-ttl=10000 \
  --immediate-retries-number=5 \
  --delayed-retries-number=3 \
  --error-queue-exchange=order-direct \
  --error-queue-exchange-type=direct \
  --error-queue-routing-key=order.dead-letter
```

---

## 5. Development & Testing Commands

```bash
DB_HOST=localhost npm run test:e2e    # Run full E2E & Resilience integration test suite on host
npm run build                         # Compile NestJS application
npm run lint                          # Run ESLint validation
```

---

## 6. Access Points

| Service | Address | Credentials |
|---------|---------|-------------|
| **Backend App Info** | http://localhost:8080/ | — |
| **Backend Health Check** | http://localhost:8080/health | — |
| **RabbitMQ Dashboard** | http://localhost:15672 | `deswal` / `deswal` (configured in `.env`) |
| **pgAdmin Dashboard** | http://localhost:8888 | `admin@gmail.com` / `deswal` |

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