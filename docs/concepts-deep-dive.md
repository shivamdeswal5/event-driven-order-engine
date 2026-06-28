# Resilient Event-Driven Order Fulfillment Engine — Concepts Deep Dive

This document explains **every concept** you'll use in this project, from the ground up.

---

## 1. Domain-Driven Design (DDD)

DDD is an approach where your **code structure mirrors the business domain**. Instead of organizing by technical layer (controllers/, services/, repositories/), you organize by **business capability**.

### Key DDD Building Blocks

| Concept | What It Is | Example in Our Project |
|---------|-----------|----------------------|
| **Entity** | Object with a unique identity that persists over time | `Order` (identified by `orderId`) |
| **Value Object** | Immutable object defined by its attributes, no identity | `Money(amount: 100, currency: 'USD')` |
| **Aggregate** | Cluster of entities treated as a single unit for data changes | `Order` aggregate (contains `OrderItems`) |
| **Aggregate Root** | The entry point entity of an aggregate — all external access goes through it | `Order` is the root; you never modify `OrderItem` directly |
| **Domain Event** | Something that happened in the domain that other parts care about | `OrderPlacedEvent`, `PaymentCompletedEvent` |
| **Repository** | Abstraction for persisting/retrieving aggregates | `OrderRepository.save(order)` |

### Why DDD Matters Here

Each module (Order, Inventory, Payment, Shipping, Notification) is a **bounded context** — it has its own models, rules, and language. The `Order` module doesn't know how `Payment` works internally. They communicate only through **domain events**.

```
┌─────────────────┐     Domain Event     ┌─────────────────┐
│  Order Context   │ ──────────────────>  │ Payment Context  │
│                  │  "OrderPlaced"       │                  │
│  Order (Entity)  │                     │  Payment (Entity) │
│  OrderItem (VO)  │  <──────────────── │  Transaction (VO) │
│                  │  "PaymentCompleted"  │                  │
└─────────────────┘                      └─────────────────┘
```

---

## 2. Vertical Slice Architecture

Traditional layered architecture organizes code **horizontally** by technical concern:

```
# ❌ Traditional Layered (horizontal)
controllers/
  order.controller.ts
  payment.controller.ts
services/
  order.service.ts
  payment.service.ts
repositories/
  order.repository.ts
  payment.repository.ts
```

Vertical Slice organizes by **feature/use-case** — each slice contains everything needed for ONE operation:

```
# ✅ Vertical Slice (our approach)
modules/order/
  src/
    features/
      place-order/
        place-order.handler.ts      # Business logic
        place-order.route.ts        # HTTP endpoint
        place-order.validation.ts   # Input validation
        place-order.types.ts        # Request/Response types
      cancel-order/
        cancel-order.handler.ts
        cancel-order.route.ts
```

### Why Vertical Slice?

- **Each feature is self-contained** — changing "place order" doesn't risk breaking "cancel order"
- **Easy to understand** — open one folder, see everything for that feature
- **Easy to extract** — if Order becomes a microservice, just move the folder

---

## 3. Modular Monolith

A monolith where code is organized into **independent modules** with clear boundaries, but deployed as a **single application**.

```
┌──────────────────────────────────────────────────┐
│                 Single Deployment                 │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Order   │  │ Payment  │  │ Inventory │      │
│  │  Module  │  │  Module  │  │  Module   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
│       └──────────────┼──────────────┘            │
│              RabbitMQ (Message Bus)               │
└──────────────────────────────────────────────────┘
```

### Rules

1. **No direct function calls** between modules for business workflows
2. **No shared database tables** — each module owns its data
3. **Communication only through events** via RabbitMQ
4. **Shared infrastructure** (message bus, HTTP exceptions) lives in `shared/`

This means any module can later become a microservice with **zero business logic changes**.

---

## 4. RabbitMQ — Complete Breakdown

RabbitMQ is a **message broker** — it receives messages from producers and routes them to consumers.

### 4.1 Core Concepts

```
Producer → Exchange → Binding → Queue → Consumer

┌──────────┐    ┌──────────────┐    ┌─────────┐    ┌──────────┐
│ Producer │───>│   Exchange   │───>│  Queue   │───>│ Consumer │
│ (Order)  │    │ (Router)     │    │ (Buffer) │    │(Payment) │
└──────────┘    └──────────────┘    └─────────┘    └──────────┘
```

| Concept | Real-World Analogy | What It Does |
|---------|-------------------|-------------|
| **Producer** | Person mailing a letter | Publishes messages to an exchange |
| **Exchange** | Post office sorting facility | Routes messages to queues based on rules |
| **Binding** | Routing rule at the post office | Connects an exchange to a queue |
| **Queue** | Mailbox | Stores messages until a consumer picks them up |
| **Consumer** | Person checking their mailbox | Reads and processes messages from a queue |
| **Routing Key** | Address on the envelope | Label attached to a message by the producer for routing decisions |
| **Binding Key** | Filter criteria on the mailbox | Pattern/key used to configure a binding between exchange and queue |

### 4.2 Exchange Types

#### Topic Exchange (Primary — for business events)

Routes messages based on **pattern matching** on routing keys.

```
Routing Key: "order.events.order-placed"

Bindings:
  payment-queue   binds with pattern "order.events.#"     ✅ MATCH
  inventory-queue binds with pattern "order.events.#"     ✅ MATCH
  shipping-queue  binds with pattern "shipping.events.#"  ❌ NO MATCH

  * = exactly one word
  # = zero or more words
```

**Why Topic Exchange?** Each module subscribes only to the events it cares about. Payment listens to `order.events.#`, Shipping listens to `order.events.order-placed` AND `payment.events.payment-completed`.

#### Fanout Exchange (For globally significant events)

Broadcasts to **ALL** bound queues, ignoring routing keys.

```
OrderCancelled event → Fanout Exchange
                        ├──> payment-cancel-queue
                        ├──> inventory-release-queue
                        ├──> shipping-abort-queue
                        └──> notification-queue
```

**Why Fanout for OrderCancelled?** When an order is cancelled, EVERY module needs to react. Fanout guarantees all get it without knowing about each other.

### 4.3 Reliability Mechanisms

#### Publisher Confirms

```
Producer sends message → RabbitMQ receives it → RabbitMQ sends ACK back to producer

Without confirms:  Producer fires message, hopes it arrives (UNSAFE)
With confirms:     Producer waits for RabbitMQ to confirm receipt (SAFE)
```

If RabbitMQ doesn't confirm, the producer knows to **retry**.

#### Consumer Acknowledgements (Manual ACK)

```
Queue delivers message → Consumer processes it → Consumer sends ACK → Queue removes message

If consumer crashes before ACK → Queue re-delivers to another consumer
```

**Auto-ACK** (dangerous): message removed from queue as soon as delivered, even if consumer crashes mid-processing.
**Manual-ACK** (what we use): message stays in queue until consumer explicitly confirms successful processing.

#### Dead Letter Queue (DLQ)

A "graveyard" queue for messages that **repeatedly fail processing**.

```
Main Queue → Consumer fails → Retry Queue (with delay) → Consumer fails again
    → After N retries → Dead Letter Queue (for manual inspection)
```

**Why?** A poison message (malformed data, bug) would loop forever without DLQ. DLQ captures it so you can investigate and fix.

#### Retry with Exponential Backoff

Instead of retrying immediately (which hammers a potentially down service), wait increasingly longer:

```
Attempt 1: fail → wait 1 second
Attempt 2: fail → wait 2 seconds  
Attempt 3: fail → wait 4 seconds
Attempt 4: fail → wait 8 seconds
Attempt 5: fail → send to DLQ
```

**Implementation**: Use a retry queue with **TTL (Time-To-Live)**. Message sits in retry queue for N seconds, then automatically re-routed back to the main queue.

---

## 5. Transactional Outbox Pattern

### The Problem

```typescript
// ❌ DANGEROUS — what if the app crashes between step 1 and 2?
async placeOrder(data) {
  await db.save(order);           // Step 1: saved to DB ✅
  // 💥 APP CRASHES HERE
  await rabbitmq.publish(event);  // Step 2: never published ❌
}
// Result: Order exists in DB but no other module knows about it!
```

### The Solution — Outbox Table

Instead of publishing directly to RabbitMQ, save the event to an **outbox table** in the **SAME database transaction** as the business data.

```typescript
// ✅ SAFE — both happen in one atomic transaction
async placeOrder(data) {
  await db.transaction(async (tx) => {
    await tx.save(order);                    // Save order
    await tx.save(outboxMessage({            // Save event to outbox
      type: 'OrderPlaced',
      payload: { orderId: order.id, items: order.items }
    }));
  });
  // Either BOTH are saved, or NEITHER is saved
}
```

A **separate background worker** (Outbox Relay) polls the outbox table and publishes messages to RabbitMQ:

```
┌─────────┐  transaction  ┌────────────────────┐
│ Handler │ ────────────> │      Database       │
│         │               │  ┌──────────────┐  │
│         │               │  │ orders table  │  │
│         │               │  │ outbox table  │  │
│         │               │  └──────────────┘  │
└─────────┘               └────────────────────┘
                                    │
                          ┌─────────┴──────────┐
                          │  Outbox Relay       │
                          │  (polls every Ns)   │
                          │  reads outbox →     │
                          │  publishes to MQ →  │
                          │  marks as sent      │
                          └────────────────────┘
                                    │
                              ┌─────┴─────┐
                              │ RabbitMQ  │
                              └───────────┘
```

### Outbox Table Schema

```sql
CREATE TABLE outbox_messages (
  id            UUID PRIMARY KEY,
  event_type    VARCHAR NOT NULL,      -- 'OrderPlaced'
  payload       JSONB NOT NULL,        -- event data
  routing_key   VARCHAR NOT NULL,      -- 'order.events.order-placed'
  exchange      VARCHAR NOT NULL,      -- 'order-exchange'
  created_at    TIMESTAMP NOT NULL,
  published_at  TIMESTAMP NULL,        -- NULL means not yet published
  retries       INT DEFAULT 0
);
```

---

## 6. Transactional Inbox Pattern

### The Problem

RabbitMQ guarantees **at-least-once delivery**, meaning a message might be delivered **multiple times** (broker restart, network glitch, consumer timeout).

```
Message: "PaymentCompleted for Order #123"
  → Delivered once: deduct inventory ✅
  → Delivered AGAIN (duplicate): deduct inventory AGAIN ❌ (double deduction!)
```

### The Solution — Inbox Table

Before processing a message, check if you've **already processed it** by looking up its ID in the inbox table.

```typescript
async handlePaymentCompleted(message) {
  const alreadyProcessed = await db.findInbox(message.id);
  if (alreadyProcessed) return; // Skip duplicate

  await db.transaction(async (tx) => {
    await tx.save(inboxRecord({ messageId: message.id }));  // Record it
    await inventoryService.deductStock(message.payload);     // Process it
  });
}
```

```
┌───────────┐     ┌──────────┐     ┌──────────────────────┐
│ RabbitMQ  │ ──> │ Consumer │ ──> │ Check inbox table    │
└───────────┘     └──────────┘     │  Already processed?  │
                                   │  YES → skip (ACK)    │
                                   │  NO  → process +     │
                                   │        save to inbox  │
                                   └──────────────────────┘
```

### Inbox Table Schema

```sql
CREATE TABLE inbox_messages (
  message_id    UUID PRIMARY KEY,      -- Same ID from the producer
  event_type    VARCHAR NOT NULL,
  processed_at  TIMESTAMP NOT NULL,
  handler_name  VARCHAR NOT NULL       -- Which handler processed it
);
```

### Together: Exactly-Once Processing

```
At-Least-Once Delivery (RabbitMQ) + Idempotent Processing (Inbox) = Exactly-Once Semantics
```

---

## 7. Saga Pattern — Compensation Logic

### The Problem

An order involves multiple modules. What if one step fails?

```
1. OrderPlaced       ✅
2. InventoryReserved ✅  
3. PaymentProcessed  ❌ FAILED (insufficient funds)
// Now inventory is reserved for an order that can't be paid!
```

### The Solution — Compensating Actions

Each step has a **reverse action** that undoes it. When a step fails, trigger compensations for all previously completed steps.

```
FORWARD FLOW (happy path):
  OrderPlaced → ReserveInventory → ProcessPayment → ArrangeShipping

COMPENSATION FLOW (payment fails):
  PaymentFailed → ReleaseInventory → CancelOrder → NotifyCustomer
```

```
┌───────────────────────────────────────────────────────────────┐
│                        Saga Flow                              │
│                                                               │
│  OrderPlaced ──> InventoryReserved ──> PaymentFailed         │
│       │                  │                    │               │
│       │                  │              ┌─────┴──────┐       │
│       │                  │              │ Compensate │       │
│       ▼                  ▼              └─────┬──────┘       │
│  OrderCancelled    InventoryReleased          │               │
│       ▲                  ▲                    │               │
│       └──────────────────┴────────────────────┘               │
│              (Fanout: OrderCancelled)                         │
└───────────────────────────────────────────────────────────────┘
```

In our system, this is a **Choreography-based Saga** — no central orchestrator. Each module listens for events and knows what to do (or undo).

---

## 8. Complete Message Flow — End to End

```
1. USER calls POST /orders
2. Order handler:
   - Creates Order in DB
   - Saves "OrderPlaced" event to OUTBOX TABLE
   - (same transaction — atomic)

3. OUTBOX RELAY (background worker):
   - Polls outbox table every 5 seconds
   - Finds unpublished "OrderPlaced"
   - Publishes to RabbitMQ (topic exchange, key: "order.events.order-placed")
   - Marks outbox record as published
   - Uses PUBLISHER CONFIRMS to ensure RabbitMQ received it

4. RabbitMQ:
   - Routes "order.events.order-placed" to:
     - inventory-queue (bound with "order.events.#")
     - payment-queue (bound with "order.events.#")

5. INVENTORY CONSUMER:
   - Receives message from inventory-queue
   - Checks INBOX TABLE — first time? Process it
   - Reserves inventory in DB + saves to inbox (same transaction)
   - Saves "InventoryReserved" to outbox
   - Sends MANUAL ACK to RabbitMQ

6. PAYMENT CONSUMER:
   - Receives message from payment-queue
   - Checks INBOX TABLE — processes payment
   - If SUCCESS: saves "PaymentCompleted" to outbox
   - If FAILURE: saves "PaymentFailed" to outbox

7. If PaymentFailed:
   - SAGA COMPENSATION kicks in
   - Inventory module hears "PaymentFailed" → releases reserved stock
   - Order module hears "PaymentFailed" → cancels order
   - "OrderCancelled" published to FANOUT EXCHANGE → all modules react

8. If PaymentCompleted:
   - Shipping module hears it → arranges shipping
   - Notification module hears it → sends confirmation email
```

---

## 9. File-by-File Architecture Breakdown

### 9.1 Shared Infrastructure Files

```
shared/
  domain/
    common/
      event.ts              # Base DomainEvent class/interface
      command.ts            # Base Command class (for imperative actions)
    outbox-message/         # Outbox entity, repository, types
    inbox-message/          # Inbox entity, repository, types

  infrastructure/
    message-bus/
      rabbitmq/
        config/             # Connection config, exchange/queue declarations
        producer/           # Generic RabbitMQ publisher with confirms
        consumer/           # Generic RabbitMQ consumer with manual ACK
      cli-commands/         # CLI to setup exchanges/queues
      message-destination-registry.ts  # Maps event types → exchange + routing key
      outbox-message-relay.service.ts  # Background worker: outbox → RabbitMQ
      inbox-message-handler.service.ts # Dedup check + inbox recording
      lazy-load-handler.service.ts     # Loads correct handler for event type

    http/
      exceptions/
        all-exception-filter.ts  # Global NestJS exception filter
        exceptions.ts            # Base exception classes
        registry.ts              # Combines all module exception mappers
        strategy.ts              # Strategy to find correct mapper
```

#### Key File Explanations

| File | Purpose |
|------|---------|
| `event.ts` | Base interface: `{ eventId, eventType, occurredAt, payload }`. All domain events extend this. |
| `command.ts` | Unlike events (past tense, facts), commands are imperative: "ProcessPayment", "ReserveInventory". |
| `message-destination-registry.ts` | Lookup table: given an event type string, returns which exchange and routing key to use for publishing. |
| `outbox-message-relay.service.ts` | Cron/interval service that polls `outbox_messages` table, publishes unpublished messages, marks them done. |
| `inbox-message-handler.service.ts` | Wraps every consumer: checks inbox for duplicates, records processed messages, ensures idempotency. |
| `lazy-load-handler.service.ts` | Given a message type string, dynamically loads the correct processor/handler class. Avoids circular dependencies. |

### 9.2 Module-Level Files

```
modules/order/
  asyncapi.yaml                              # Contract: what events this module produces/consumes
  src/
    domain/
      events/
        order-placed.event.ts                # OrderPlacedEvent definition
        order-cancelled.event.ts
      exceptions/
        exceptions.ts                        # OrderNotFoundError, InvalidOrderStateError
    features/
      place-order/
        place-order.handler.ts               # Core business logic
        place-order.route.ts                 # HTTP POST /orders
        place-order.validation.ts            # Zod/class-validator schema
    infrastructure/
      message-bus/
        order.message-destination.ts         # Registers Order events → exchange/routing key
        rabbitmq/
          config/                            # Order-specific exchange/queue declarations
          producer/                          # Order module's producer worker
          consumer/                          # Order module's consumer worker
      processors/
        handle-payment-failed.processor.ts   # Reacts to PaymentFailed → cancels order
        signature.types.service.ts           # Type-safe processor signatures
      http/
        exceptions/
          registry.ts                        # Maps Order domain errors → HTTP responses
          mappers.ts                         # OrderNotFound → 404, InvalidState → 409
```

#### AsyncAPI (`asyncapi.yaml`)

This is the **async contract** for a module — like OpenAPI/Swagger but for message-based communication.

```yaml
# order/asyncapi.yaml
asyncapi: '2.6.0'
info:
  title: Order Module
  version: '1.0.0'

channels:
  order.events.order-placed:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId: { type: string }
            items: { type: array }
            totalAmount: { type: number }

  order.events.order-cancelled:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId: { type: string }
            reason: { type: string }
```

---

## 10. Architecture Review & Suggestions

### What Your Senior Got Right ✅

1. **Outbox + Inbox** — Gold standard for reliable async messaging
2. **Module-specific producer/consumer workers** — Each module can be extracted independently
3. **AsyncAPI contracts** — Excellent for documentation and cross-team communication
4. **Topic exchange for business events** — Flexible routing without tight coupling
5. **Retry queue with TTL + DLQ** — Proper failure handling
6. **Domain exceptions separate from HTTP** — Clean architecture boundary
7. **Vertical slice within modules** — Features are self-contained

### Suggestions & Refinements 🔧

#### 1. Exchange Strategy Clarification

> [!TIP]
> Use **one topic exchange per module** (e.g., `order-exchange`, `payment-exchange`) for business events, plus **one shared fanout exchange** for globally significant events like `OrderCancelled`.

This keeps routing clean and maps directly to bounded contexts.

#### 2. Message Envelope Standardization

Create a standard message envelope that wraps every event/command:

```typescript
interface MessageEnvelope<T> {
  messageId: string;          // UUID — used for inbox dedup
  correlationId: string;      // Traces the entire saga flow
  causationId: string;        // Which message caused this one
  type: string;               // 'OrderPlaced'
  source: string;             // 'order-module'
  occurredAt: Date;
  payload: T;
  metadata: {
    version: number;          // Schema version for evolution
    retryCount: number;
  };
}
```

`correlationId` is crucial — it lets you trace the entire order lifecycle across all modules for debugging.

#### 3. Idempotency Key Strategy

> [!IMPORTANT]
> The inbox should use `messageId + handlerName` as the composite key, not just `messageId`. The same event might be processed by multiple handlers within the same module.

#### 4. Outbox Relay — Polling vs CDC

Your senior uses **polling** (simple, good starting point). For higher throughput later, consider **Change Data Capture (CDC)** with tools like Debezium that stream database changes directly to RabbitMQ. But polling is absolutely fine for this project.

#### 5. Order Status State Machine

Enforce valid state transitions with a state machine:

```
PLACED → INVENTORY_RESERVED → PAYMENT_PROCESSING → PAID → SHIPPING → DELIVERED
  │              │                    │
  ▼              ▼                    ▼
CANCELLED   CANCELLED           PAYMENT_FAILED → CANCELLING → CANCELLED
```

#### 6. Consider Adding a Correlation Store

For saga debugging, store the full event chain:

```sql
CREATE TABLE saga_correlation (
  correlation_id  UUID,
  event_type      VARCHAR,
  module          VARCHAR,
  occurred_at     TIMESTAMP,
  payload         JSONB
);
```

This lets you query: "Show me everything that happened for Order #123" across all modules.

---

## 11. Technology Stack Recommendation

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js + TypeScript | Your existing expertise |
| Framework | NestJS | Built-in module system, DI, perfect for modular monolith |
| Database | PostgreSQL | JSONB for event payloads, robust transactions |
| ORM | TypeORM or Drizzle | Transaction support, migration management |
| Message Broker | RabbitMQ | As specified, with `amqplib` or `@golevelup/nestjs-rabbitmq` |
| Validation | Zod or class-validator | Request validation per feature |
| API Docs | Swagger (HTTP) + AsyncAPI (events) | Complete API documentation |

---

## 12. Glossary — Quick Reference

| Term | One-Line Definition |
|------|-------------------|
| **Bounded Context** | A module boundary where a specific domain model applies |
| **Domain Event** | A record that something meaningful happened (past tense) |
| **Command** | An instruction to do something (imperative) |
| **Aggregate** | A cluster of objects treated as one unit for transactions |
| **Outbox Pattern** | Save events to DB in same transaction, publish later |
| **Inbox Pattern** | Track processed messages to skip duplicates |
| **Saga** | A sequence of local transactions with compensating actions |
| **Publisher Confirm** | RabbitMQ acknowledges it received the message |
| **Consumer ACK** | Consumer tells RabbitMQ it successfully processed a message |
| **DLQ** | Queue for messages that failed all retry attempts |
| **Topic Exchange** | Routes by pattern matching on routing keys |
| **Fanout Exchange** | Broadcasts to all bound queues |
| **Routing Key** | Label on a message used for routing decisions |
| **Binding** | Rule connecting an exchange to a queue |
| **TTL** | Time-To-Live — how long a message sits in retry queue |
| **Idempotent** | Processing the same message multiple times has the same effect as once |
| **At-Least-Once** | Guaranteed delivery, but may deliver duplicates |
| **Exactly-Once Semantics** | At-least-once delivery + idempotent processing |
| **Choreography Saga** | Each service reacts to events independently (no orchestrator) |
| **Compensation** | The reverse action that undoes a completed step |
| **AsyncAPI** | OpenAPI equivalent for event-driven APIs |
| **CDC** | Change Data Capture — streaming DB changes as events |
| **Modular Monolith** | Single deployment with independent internal modules |
| **MikroORM** | TypeScript ORM with Unit of Work and Identity Map patterns |
| **Unit of Work** | Tracks all entity changes and flushes them in a single transaction |
| **Identity Map** | Ensures each DB row maps to exactly one object instance in memory |
| **CQRS** | Separating read (query) and write (command) operations |
| **Command** | An intent to change system state (imperative, e.g., PlaceOrderCommand) |
| **Query** | A request to read data without side effects (e.g., GetOrderQuery) |
| **DTO** | Data Transfer Object — validates and shapes data crossing boundaries |
| **Docker** | Containerization platform for consistent deployment environments |
| **Docker Compose** | Tool for defining and running multi-container Docker applications |
| **amqplib** | Low-level Node.js client library for AMQP 0-9-1 (RabbitMQ protocol) |
| **CORS** | Browser security mechanism controlling cross-origin HTTP requests |
| **OpenAPI/Swagger** | Specification and UI for documenting REST APIs |
| **Multi-stage Build** | Dockerfile technique using multiple FROM stages for smaller production images |
| **ValidationPipe** | NestJS pipe that auto-validates incoming DTOs using class-validator |

---

## 13. CQRS Pattern (Command Query Responsibility Segregation)

CQRS means **separating the code that writes data from the code that reads data**. Instead of one service doing both, you have:

- **Commands** — change state (create, update, delete). Named imperatively: `PlaceOrderCommand`, `CancelOrderCommand`
- **Queries** — read state (get, list, search). Named as questions: `GetOrderQuery`, `ListOrdersQuery`

### Why CQRS?

```
# ❌ Without CQRS — one fat service does everything
order.service.ts
  placeOrder()        // write
  cancelOrder()       // write
  getOrder()          // read
  listOrders()        // read
  getOrderStats()     // read

# ✅ With CQRS — separated by intent
place-order/
  place-order.command.ts       // defines the command shape
  place-order.handler.ts       // executes the write logic

get-order/
  get-order.query.ts           // defines the query shape
  get-order.handler.ts         // executes the read logic
```

### File Naming Convention

```
feature-name/
  feature-name.command.ts      # Command DTO (for writes)
  feature-name.query.ts        # Query DTO (for reads)
  feature-name.handler.ts      # Business logic
  feature-name.route.ts        # HTTP endpoint
  feature-name.dto.ts          # Request/Response validation
```

### Command vs Query — Simple Rule

| Aspect | Command | Query |
|--------|---------|-------|
| Purpose | **Change** something | **Read** something |
| Side effects | Yes (DB writes, events) | No (read-only) |
| Returns | Success/failure or created ID | Data |
| Example | `PlaceOrderCommand` | `GetOrderQuery` |
| HTTP Method | POST, PUT, PATCH, DELETE | GET |

### How They Flow

```
POST /orders (place order)
  → Controller creates PlaceOrderCommand
  → Handler receives command
  → Handler saves to DB + outbox
  → Returns orderId

GET /orders/:id
  → Controller creates GetOrderQuery
  → Handler receives query
  → Handler reads from DB
  → Returns order data
```

---

## 14. MikroORM — Our ORM

MikroORM is a TypeScript ORM built around two powerful patterns: **Unit of Work** and **Identity Map**.

### 14.1 Why MikroORM Over TypeORM?

| Feature | MikroORM | TypeORM |
|---------|----------|---------|
| Unit of Work | ✅ Built-in | ❌ Manual |
| Identity Map | ✅ Built-in | ❌ No |
| Transaction safety | ✅ Automatic batching | ❌ Manual flush |
| Type safety | ✅ Strict | ⚠️ Partial |
| Active maintenance | ✅ Very active | ⚠️ Slower |

### 14.2 Unit of Work Pattern

Instead of saving entities one by one (hitting the DB multiple times), MikroORM **tracks all changes** and flushes them in **one transaction** at the end.

```typescript
// ❌ Without Unit of Work — multiple DB calls
await orderRepo.save(order);           // DB call 1
await outboxRepo.save(outboxMessage);  // DB call 2
// What if call 2 fails? Inconsistent state!

// ✅ With Unit of Work (MikroORM) — one atomic flush
em.persist(order);                     // tracked, not saved yet
em.persist(outboxMessage);             // tracked, not saved yet
await em.flush();                      // ONE transaction, both saved atomically
```

This is **perfect** for our Outbox pattern — the business entity and the outbox message are always saved together or not at all.

### 14.3 Identity Map

Ensures that if you load the same entity twice, you get the **same object reference** — no stale data, no duplicates.

```typescript
const order1 = await em.findOne(Order, { id: '123' });  // DB query
const order2 = await em.findOne(Order, { id: '123' });  // NO DB query, returns cached
order1 === order2;  // true — same object in memory
```

### 14.4 Entity Definition

```typescript
@Entity()
export class Order {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  customerEmail!: string;

  @Enum(() => OrderStatus)
  status!: OrderStatus;

  @Property({ type: 'jsonb' })
  items!: OrderItem[];

  @Property()
  totalAmount!: number;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

### 14.5 EntityManager (em)

The `EntityManager` is your main interface. Think of it as your **database session**.

```typescript
// Create
const order = em.create(Order, { customerEmail: 'user@test.com', ... });
em.persist(order);
await em.flush();

// Read
const order = await em.findOne(Order, { id: orderId });

// Update
order.status = OrderStatus.CANCELLED;
await em.flush();  // auto-detects the change and updates

// Delete
em.remove(order);
await em.flush();
```

---

## 15. DTOs & Validation in NestJS

### 15.1 What Are DTOs?

A **Data Transfer Object (DTO)** is a class that defines the shape of data coming **into** or going **out of** your API. DTOs are your **gatekeepers** — they validate, transform, and type-check all external input.

```
Client Request → DTO (validates) → Handler (processes) → Response DTO (shapes output)
```

### 15.2 File Naming

```
place-order/
  place-order.dto.ts           # PlaceOrderDto (input validation)
  place-order.response.dto.ts  # PlaceOrderResponseDto (output shape) [optional]
```

### 15.3 class-validator + class-transformer

```typescript
// place-order.dto.ts
import { IsEmail, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class PlaceOrderDto {
  @IsEmail()
  customerEmail!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
```

### 15.4 NestJS ValidationPipe

NestJS automatically validates DTOs using a global `ValidationPipe`:

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // strips unknown properties
  forbidNonWhitelisted: true, // throws on unknown properties
  transform: true,           // auto-transforms types
}));
```

Now any invalid request is **automatically rejected** with a 400 Bad Request before your handler even runs.

---

## 16. Docker & Docker Compose

### 16.1 Why Docker?

Docker ensures **everyone runs the exact same environment** — same Node.js version, same PostgreSQL, same RabbitMQ. No "works on my machine" problems.

### 16.2 Our Dockerfile — Line by Line

```dockerfile
ARG NODE_IMAGE=node:20.15.1-alpine3.20           # Alpine = tiny Linux (~5MB)

# --- Stage 1: Base ---
FROM $NODE_IMAGE AS base
WORKDIR /app                                       # All commands run from /app
RUN apk --no-cache add dumb-init                   # Proper signal handling (SIGTERM)
RUN mkdir -p /app && chown node:node /app           # Security: don't run as root
USER node                                          # Switch to non-root user

# --- Stage 2: Build ---
FROM base AS build
COPY --chown=node:node ./package*.json ./           # Copy package files first (cache layer)
COPY --chown=node:node . .                          # Copy source code
RUN npm ci && npm cache clean --force               # Install exact versions from lock file
RUN npm run build && npm prune --production         # Build TS→JS, remove dev dependencies

# --- Stage 3: Production ---
FROM base AS production
WORKDIR /app
ENV APP_PORT=8080
COPY --chown=node:node --from=build /app/node_modules ./node_modules  # Only prod deps
COPY --chown=node:node --from=build /app/dist ./dist                  # Only compiled JS
COPY --chown=node:node . .
EXPOSE $APP_PORT
CMD ["dumb-init", "node", "dist/main"]              # dumb-init = proper process manager
```

**Multi-stage build** = smaller final image. Build stage has TypeScript, dev deps, source. Production stage has only compiled JS and production deps.

### 16.3 Docker Compose

```yaml
# docker-compose.yml
services:
  backend:
    build: .
    ports: ['8080:8080']
    depends_on: [postgres, rabbitmq]
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/orders
      RABBITMQ_URL: amqp://user:pass@rabbitmq:5672

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes: ['pgdata:/var/lib/postgresql/data']

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports: ['5672:5672', '15672:15672']      # 15672 = management UI

volumes:
  pgdata:
```

### 16.4 Running Commands Inside Containers

```bash
# Enter the backend container shell
docker compose exec backend sh

# Run migrations
docker compose exec backend npm run migration:up

# Run a CLI command
docker compose exec backend node dist/cli.js setup-queues
```

---

## 17. amqplib — Raw RabbitMQ Client

`amqplib` is the **low-level** Node.js client for RabbitMQ. We use it raw (no wrapper library) for full control.

### 17.1 Connection & Channel

```typescript
import amqp from 'amqplib';

// Connection = TCP connection to RabbitMQ server
const connection = await amqp.connect('amqp://user:pass@localhost:5672');

// Channel = lightweight virtual connection (multiplexed over one TCP connection)
// Most operations happen on channels
const channel = await connection.createConfirmChannel(); // confirm channel for publisher confirms
```

**Rule**: One connection per application, one channel per thread/worker.

### 17.2 Declaring Exchanges & Queues

```typescript
// Declare a topic exchange (idempotent — safe to call multiple times)
await channel.assertExchange('order-exchange', 'topic', { durable: true });

// Declare a queue
await channel.assertQueue('payment-order-events-queue', {
  durable: true,              // survives broker restart
  deadLetterExchange: 'dlx-exchange',   // failed messages go here
  deadLetterRoutingKey: 'dlq.payment',
});

// Bind queue to exchange with routing pattern
await channel.bindQueue('payment-order-events-queue', 'order-exchange', 'order.events.#');
```

### 17.3 Publishing with Confirms

```typescript
// Publisher confirms = RabbitMQ ACKs that it received and persisted the message
channel.publish(
  'order-exchange',                    // exchange name
  'order.events.order-placed',        // routing key
  Buffer.from(JSON.stringify(payload)), // message body (always Buffer)
  {
    persistent: true,                  // survives broker restart
    messageId: uuid(),                 // for inbox dedup
    contentType: 'application/json',
    headers: { 'x-retry-count': 0 },
  }
);

// Wait for RabbitMQ to confirm
await channel.waitForConfirms();  // throws if NACK'd
```

### 17.4 Consuming with Manual ACK

```typescript
channel.prefetch(1);  // process one message at a time

channel.consume('payment-order-events-queue', async (msg) => {
  if (!msg) return;

  try {
    const payload = JSON.parse(msg.content.toString());
    await processMessage(payload);
    channel.ack(msg);       // ✅ Success — remove from queue
  } catch (error) {
    const retryCount = (msg.properties.headers['x-retry-count'] || 0);
    if (retryCount < 5) {
      channel.nack(msg, false, false);  // send to DLX/retry queue
    } else {
      channel.nack(msg, false, false);  // send to DLQ (permanent failure)
    }
  }
}, { noAck: false });  // CRITICAL: manual ACK mode
```

### 17.5 Key amqplib Methods

| Method | Purpose |
|--------|---------|
| `connect()` | Establish TCP connection to RabbitMQ |
| `createConfirmChannel()` | Create channel with publisher confirms enabled |
| `assertExchange()` | Declare an exchange (idempotent) |
| `assertQueue()` | Declare a queue (idempotent) |
| `bindQueue()` | Bind queue to exchange with routing pattern |
| `publish()` | Send message to an exchange |
| `consume()` | Start listening on a queue |
| `ack(msg)` | Acknowledge successful processing |
| `nack(msg)` | Negative acknowledge (reject/requeue) |
| `prefetch(n)` | Limit unacknowledged messages per consumer |
| `waitForConfirms()` | Wait for broker to confirm message receipt |

---

## 18. CORS (Cross-Origin Resource Sharing)

CORS controls which **external origins** (domains) can call your API from a browser. When we add a frontend later, it will run on a different port/domain than our backend.

```typescript
// main.ts — NestJS CORS setup
app.enableCors({
  origin: ['http://localhost:3000'],   // allowed frontend origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

For now (backend-only), we enable it broadly for testing tools like Postman or a future frontend.

---

## 19. OpenAPI (Swagger) & AsyncAPI

### 19.1 OpenAPI / Swagger — HTTP API Docs

Documents your REST endpoints. NestJS has built-in Swagger support:

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Order Fulfillment Engine')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
// Visit http://localhost:8080/api/docs
```

Decorators on your DTOs auto-generate the docs:

```typescript
export class PlaceOrderDto {
  @ApiProperty({ example: 'user@test.com', description: 'Customer email' })
  @IsEmail()
  customerEmail!: string;
}
```

### 19.2 AsyncAPI — Event/Message Docs

AsyncAPI is the **OpenAPI equivalent for event-driven APIs**. Each module has an `asyncapi.yaml` that documents:
- What events it **publishes** (produces)
- What events it **subscribes to** (consumes)
- The payload schema for each event

This acts as the **contract** between modules. If the Order module changes `OrderPlacedEvent`'s schema, the `asyncapi.yaml` must be updated, alerting all consuming modules.

```yaml
# order/asyncapi.yaml
asyncapi: '2.6.0'
info:
  title: Order Module Async API
channels:
  order.events.order-placed:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId: { type: string, format: uuid }
            items: { type: array }
```

---

## 20. Message Envelope & Correlation

Every message flowing through the system wraps the actual payload in a **standard envelope**:

```typescript
interface MessageEnvelope<T> {
  messageId: string;       // UUID — unique per message, used for inbox dedup
  correlationId: string;   // UUID — same across the entire saga flow
  causationId: string;     // messageId of the event that caused this one
  type: string;            // 'OrderPlaced', 'PaymentCompleted'
  source: string;          // 'order-module', 'payment-module'
  occurredAt: Date;
  payload: T;              // actual business data
  metadata: {
    version: number;       // schema version (for future evolution)
    retryCount: number;    // how many times this has been retried
  };
}
```

### Why correlationId?

When debugging, you can trace the **entire order lifecycle** across all modules:

```
correlationId: "abc-123"
  → OrderPlaced         (order module)
  → InventoryReserved   (inventory module)
  → PaymentCompleted    (payment module)
  → ShipmentCreated     (shipping module)
  → NotificationSent    (notification module)
```

One query shows you everything that happened for one order.

### causationId Chain

```
OrderPlaced (messageId: "m1", causationId: null)
  → InventoryReserved (messageId: "m2", causationId: "m1")
    → PaymentCompleted (messageId: "m3", causationId: "m2")
      → ShipmentCreated (messageId: "m4", causationId: "m3")
```

This creates a **causal chain** — you can see exactly which event triggered which.
