# Resilient Event-Driven Order Fulfillment Engine

A production-grade, backend-only order fulfillment system built with **Domain-Driven Design (DDD)** and **Vertical Slice Architecture**. The system processes the complete lifecycle of an order — from placement to shipping — using asynchronous, event-driven communication powered by **RabbitMQ**.

---

## Architecture Overview

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

The application is a **modular monolith** where each domain module operates independently and communicates exclusively through **domain events**. Any module can later be extracted as a microservice with zero business logic changes.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **NestJS** | Backend framework with built-in DI and module system |
| **TypeScript** | Strict mode for type safety |
| **MikroORM** | ORM with Unit of Work and Identity Map patterns |
| **PostgreSQL 16** | Primary database with JSONB and SKIP LOCKED |
| **RabbitMQ 3.x** | Message broker for async event communication |
| **amqplib** | Raw RabbitMQ client for full control |
| **Docker** | Containerized development and deployment |
| **Swagger** | Auto-generated OpenAPI documentation |

---

## Key Patterns & Concepts

| Pattern | What It Solves |
|---------|---------------|
| **Transactional Outbox** | Guarantees events are published — saved atomically with business data |
| **Transactional Inbox** | Prevents duplicate processing — exactly-once semantics |
| **Choreography Saga** | Handles partial failures with compensating actions across modules |
| **Dead Letter Queue** | Captures permanently failed messages for investigation |
| **Retry + Exponential Backoff** | Recovers from transient failures gracefully |
| **Publisher Confirms** | Ensures RabbitMQ received and persisted the message |
| **Manual ACK** | Consumer controls when a message is removed from the queue |
| **CQRS** | Separates command (write) and query (read) operations |

---

## Order Lifecycle

```
POST /api/orders
  → OrderPlaced event
    → Inventory reserves stock (InventoryReserved)
      → Payment processes (PaymentCompleted / PaymentFailed)
        → If success: Shipping arranged → Delivered
        → If failure: Inventory released → Order cancelled (Saga Compensation)
```

**Happy Path:**
```
PLACED → INVENTORY_RESERVED → PAYMENT_PROCESSING → PAID → SHIPPING → DELIVERED
```

**Compensation Path (payment fails):**
```
PAYMENT_FAILED → Release Inventory → Cancel Order → Notify Customer
```

---

## Project Structure

```
src/
├── shared/                    # Infrastructure: message bus, outbox/inbox, exceptions
│   ├── domain/                # Base entities, event/command/query interfaces
│   └── infrastructure/        # RabbitMQ, HTTP exceptions, database, config
├── order/                     # Order bounded context
├── inventory/                 # Inventory bounded context
├── payment/                   # Payment bounded context
├── shipping/                  # Shipping bounded context
└── notification/              # Notification bounded context
```

Each module follows Vertical Slice Architecture:
```
module/
├── asyncapi.yaml              # Async event contract
├── module.ts                  # NestJS module
└── src/
    ├── domain/                # Entities, enums, events, exceptions
    ├── features/              # Vertical slices (command/query + handler + DTO + route)
    └── infrastructure/        # Message bus, processors, HTTP exception mappers
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20.x (for local development outside container)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd event-driven-order-engine

# Start all services (PostgreSQL, RabbitMQ, Backend)
docker compose up -d

# Enter backend container
docker compose exec backend sh

# Run database migrations
npm run migration:up

# Setup RabbitMQ exchanges and queues
npm run setup:message-bus
```

### Useful Commands

```bash
docker compose up -d                              # Start all services
docker compose exec backend sh                    # Enter container shell
docker compose logs -f backend                    # View backend logs
docker compose restart backend                    # Restart backend
docker compose down                               # Stop all services
```

### Access Points

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8080 |
| Swagger Docs | http://localhost:8080/api/docs |
| RabbitMQ Management | http://localhost:15672 (guest/guest) |

---

## API Endpoints

### Order Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Place a new order |
| GET | `/api/orders/:id` | Get order by ID |
| GET | `/api/orders` | List orders (with pagination & filters) |
| POST | `/api/orders/:id/cancel` | Cancel an order |

### Inventory Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/products` | Add a product |
| GET | `/api/products/:id` | Get product details |
| GET | `/api/products` | List all products |
| PATCH | `/api/products/:id/stock` | Adjust stock quantity |

### Payment Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/:orderId` | Get payment for order |
| GET | `/api/payments` | List all payments |

### Shipping Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shipments/:orderId` | Get shipment for order |
| GET | `/api/shipments` | List all shipments |
| PATCH | `/api/shipments/:id/status` | Update shipment status |

### Notification Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List all notifications |
| GET | `/api/notifications/:orderId` | Notifications by order |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (DB + RabbitMQ + Relay) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Concepts Deep Dive](./concepts-deep-dive.md) | All architectural concepts explained |
| [Product Requirements](./docs/01-product-requirements.md) | Features, user stories, MVP scope |
| [Technical Requirements](./docs/02-technical-requirements.md) | Stack decisions, architecture, project structure |
| [App Flow](./docs/03-app-flow.md) | API flows, event flows, saga compensation |
| [Backend Schema](./docs/04-backend-schema.md) | Database tables, relationships, indexes |
| [Implementation Plan](./docs/05-implementation-plan.md) | 10-phase build roadmap |
| [Project Context](./docs/project-context.md) | AI-friendly handoff document |

---

## Resilience Features

- **🔄 Message Guaranteed Delivery** — Outbox pattern ensures no events are lost, even during crashes
- **🛡️ Exactly-Once Processing** — Inbox pattern deduplicates messages at the application level
- **♻️ Automatic Retry** — Failed messages retry with exponential backoff (1s → 2s → 4s → 8s → 16s)
- **💀 Dead Letter Queue** — Permanently failed messages captured for manual inspection
- **⚡ Saga Compensation** — Partial failures automatically trigger rollback across all modules
- **🔗 Correlation Tracing** — Every event carries a correlationId for end-to-end debugging
- **📡 Publisher Confirms** — RabbitMQ confirms it received and persisted each message
- **✋ Manual Acknowledgements** — Messages stay in queue until consumer confirms processing

---

## License

MIT