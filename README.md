# Backend — Event-Driven Order Fulfillment Engine

NestJS **modular monolith** for asynchronous order fulfillment. Bounded contexts talk through **domain events** (RabbitMQ), not shared tables. Reliability uses **transactional outbox / inbox**. Realtime UI updates use a **Redis** Socket.io backplane so CLI workers can reach browsers.

Teaching / portfolio oriented — patterns you’d expect in production systems, runnable locally with Docker Compose.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose                               │
│  PostgreSQL 16  ·  RabbitMQ  ·  Redis 7  ·  NestJS backend       │
│                                                                  │
│   Order │ Inventory │ Payment │ Shipping │ Notification          │
│   (each: own schema · features/ slices · outbox · consumers)     │
│                           │                                      │
│              events → RabbitMQ topic topology                    │
│              workers → Redis pub/sub → Socket.io → Console       │
└─────────────────────────────────────────────────────────────────┘
```

Modules communicate only via events. Separate schemas (`order_schema`, `inventory_schema`, …) enforce ownership and keep a realistic path to later microservice extraction.

### Happy-path saga (short)

1. `POST /api/orders` → OrderPlaced (outbox)  
2. Inventory reserves → Payment charges (`.99` totals fail on purpose)  
3. On payment success → order **PAID**, shipment **PENDING** (`ShipmentCreated`)  
4. Operator **ship** → `ShipmentShipped` → order **SHIPPED**  
5. Operator **deliver** → `ShipmentDelivered` → order **DELIVERED**  

Notification persists a ledger and pushes live updates to the frontend.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | NestJS (DI, modules) |
| DB | PostgreSQL 16 · multi-schema · `SKIP LOCKED` outbox polling |
| ORM | MikroORM |
| Broker | RabbitMQ (topic / fanout, retries, DLQ) |
| Realtime | Redis 7 + Socket.io adapter / emitter |
| Runtime | TypeScript · Node.js 20+ |

---

## Quick start

### Prerequisites

- Docker & Docker Compose  
- Node.js 20+ (for host-side scripts if you prefer not to use the container shell)

### 1. Configure & boot infra

```bash
cd backend
cp .env.example .env
docker compose up -d
```

Services: Postgres, pgAdmin, RabbitMQ (management UI), Redis, backend container.

### 2. Migrations & seed

Inside the container:

```bash
docker compose exec backend npm run migration:up:shared
docker compose exec backend npm run migration:up:order
docker compose exec backend npm run migration:up:inventory
docker compose exec backend npm run migration:up:payment
docker compose exec backend npm run migration:up:shipping
docker compose exec backend npm run migration:up:notification

docker compose exec backend npm run seed:run:inventory
```

Or on the host (with `DB_HOST=localhost` and matching credentials from `.env`).

### 3. API process

Dev server in the container is typically already up via Compose. On the host:

```bash
DB_HOST=localhost \
RABBITMQ_URL=amqp://deswal:deswal@localhost:5672 \
REDIS_HOST=localhost \
npm run start:dev
```

### 4. Consumers + outbox relays

From the **repo root** (recommended):

```bash
./start-workers.sh
```

This kills stale workers, then starts `handle-messages` and continuous `dispatch-messages` for every module inside `order-engine-backend`.

Manual equivalent (per module):

```bash
npm run handle-messages -- --module=order
npm run dispatch-messages -- --module=order --continuous
# … inventory, payment, shipping, notification
```

### 5. Exercise the saga

- Import `postman_collection.json` (project / backend docs as available), **or** use the frontend Console.  
- `GET /api/products` → `POST /api/orders`  
- Watch RabbitMQ Management and/or Console topology  
- When PAID: ship, then deliver via operator endpoints / Console buttons  

---

## Access points

| Service | URL | Notes |
|---------|-----|--------|
| API | http://localhost:8080 | Info / routes |
| Health | http://localhost:8080/health | |
| RabbitMQ Management | http://localhost:15672 | user/pass from `.env` (default `deswal` / `deswal`) |
| pgAdmin | http://localhost:8888 | from `.env` |
| Redis | localhost:6379 | Socket.io backplane |

---

## Useful commands

```bash
DB_HOST=localhost npm run test:e2e   # E2E / resilience suite
npm run build
npm run lint
```

Outbox poll interval: `OUTBOX_POLLING_INTERVAL_MS` (default `1000` in `.env.example` for a snappy demo).

Advanced CLI flags for queue/exchange overrides belong in ops experiments — see scripts help / `docs/rabbitmq-setup.md` rather than day-one setup.

---

## Documentation

| Doc | Topic |
|-----|--------|
| [01 Product requirements](./docs/01-product-requirements.md) | Goals & scope |
| [02 Technical requirements](./docs/02-technical-requirements.md) | Stack & constraints |
| [03 App flow](./docs/03-app-flow.md) | Endpoints & flow |
| [04 Schema](./docs/04-backend-schema.md) | Postgres layouts |
| [07 Architecture patterns](./docs/07-architecture-patterns.md) | DDD, slices, CQRS (light) |
| [08 Saga map](./docs/08-event-flow-saga-map.md) | Event choreography |
| [RabbitMQ setup](./docs/rabbitmq-setup.md) | Topology & outbox |
| [Redis setup](./docs/redis-setup.md) | Realtime backplane |
| [WebSocket setup](./docs/websocket-setup.md) | Socket.io rooms |

Frontend Console & Learn UI: [`../frontend/README.md`](../frontend/README.md).
