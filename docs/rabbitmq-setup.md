# RabbitMQ & Shared Infrastructure Setup Guide

This guide is a comprehensive, production-grade deep dive into the event-driven RabbitMQ infrastructure, transactional messaging patterns, CLI orchestration, and global exception mappers implemented in the `event-driven-order-engine`. It is designed to take you from a beginner to a pro in resilient, distributed architecture.

---

## 1. Introduction to Event-Driven Bounded Contexts

### The Mental Model
When building traditional monolithic applications, modules talk to each other directly via function calls. In a microservices or modular monolith architecture, we want modules (like **Order**, **Payment**, and **Inventory**) to be completely decoupled. If the **Order** module calls the **Payment** module directly over HTTP or via a direct database query, we introduce tight coupling: if the **Payment** module goes down, the **Order** module fails too.

To solve this, we use **Event-Driven Architecture (EDA)**. Instead of calling another module, a module performs its local business action and publishes a **Domain Event** (e.g., `OrderPlacedEvent`) to a message broker (RabbitMQ). Any interested module subscribes to this event and reacts to it independently. This creates a highly resilient system where services can fail, scale, and restart without bringing down the rest of the application.

---

## 2. Transactional Messaging Patterns

To build resilient, eventually consistent microservices, we must solve two critical distributed systems problems: **The Dual-Write Problem** and **Idempotent Consumption**.

```
                           THE DUAL-WRITE PROBLEM
                           
                  ┌─────────────────────────────────────┐
                  │          Client Request             │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │  Write to PostgreSQL    │             │   Publish to RabbitMQ   │
    │  (State: Order Created) │             │  (Event: OrderPlaced)   │
    └─────────────────────────┘             └─────────────────────────┘
                 │                                       │
      If DB write succeeds, but               If publish succeeds, but
      network/broker fails, the               database transaction rolls
      event is lost forever.                  back, a phantom event is sent.
```

### 2.1 The Dual-Write Problem & Transactional Outbox
*   **What**: The dual-write problem occurs when a microservice needs to update a database and publish an event to a message broker. Because these are two separate network calls, they cannot participate in a single distributed transaction.
*   **Why**: A network call to RabbitMQ cannot participate in a PostgreSQL database transaction. If the database transaction commits but the network fails before publishing, the message is lost. If the message is published but the database transaction rolls back, we publish a "phantom event" representing an action that never actually occurred.
*   **How**: Instead of sending the message to RabbitMQ directly during the business request, we save the message details inside a table called `outbox_messages` as part of the *same* database transaction as the business entity changes. This guarantees that either both succeed, or both roll back. A separate background process (the **Outbox Relay**) polls this table, publishes messages with publisher confirmations, and marks them as `processed = true`.

#### Detailed Outbox Workflow
1. **Client Action**: A user clicks "Buy". The **Order HTTP Controller** receives the request and forwards it to the **Place Order Handler**.
2. **Atomic Write**: The handler creates the `Order` entity and creates an `OrderPlacedEvent`. Using MikroORM's Unit of Work, it writes the `Order` record to the `orders` table and writes the serialized event to the `outbox_messages` table. This happens in a single transaction block (`BEGIN ... COMMIT`).
3. **Relay Poller**: Every few seconds, the **Outbox Relay Service** runs a background query using `SELECT FOR UPDATE SKIP LOCKED` to fetch a batch of unprocessed outbox records.
    * *Why Skip Locked?* If you run multiple instances of the backend, they will poll the database concurrently. `SKIP LOCKED` ensures that Instance A locks its batch and Instance B skips those locked rows, preventing duplicate processing and database bottlenecks.
4. **Publish & Confirm**: The relay publishes the serialized payload to RabbitMQ. It waits for **Publisher Confirmations** (an acknowledgment from RabbitMQ that the message was received and written to disk).
5. **Mark Processed**: Once RabbitMQ confirms the message is safe, the relay updates the outbox row: `processed = true`, setting the `processed_at` timestamp.

#### Outbox Database Row Example
If a client places an order, the database transaction writes the following row to `outbox_messages`:
```json
{
  "id": "a5b81b22-83b6-4dfb-91cc-a720df38c5b0",
  "created_at": "2026-06-26T10:24:43.000Z",
  "updated_at": "2026-06-26T10:24:43.000Z",
  "event_type": "OrderPlacedEvent",
  "payload": {
    "orderId": "d748f219-c09a-41df-a720-33bfa8a9c221",
    "customerId": "cust_8213",
    "totalAmount": 129.99
  },
  "exchange": "order-exchange",
  "routing_key": "order.placed",
  "correlation_id": "corr_f3b9281a-4921-4f9b",
  "causation_id": "caus_f3b9281a-4921-4f9b",
  "processed": false,
  "processed_at": null
}
```

---

### 2.2 Idempotency & Transactional Inbox
*   **What**: A mechanism that guarantees a message is processed exactly once by a given handler, even if it is received multiple times.
*   **Why**: Message brokers like RabbitMQ guarantee **at-least-once delivery**. A consumer might successfully process a message but crash or experience a network timeout *before* it can send the acknowledgment (`ACK`) back to RabbitMQ. RabbitMQ will then redeliver the message. Without idempotency, this would execute side effects (like charging a credit card or deducting inventory) multiple times.
*   **How**: When a message is received, the consumer checks if an entry with the composite key `(message_id, handler_name)` exists in the `inbox_messages` table. If it exists, the message is immediately acknowledged and skipped. If not, the handler executes, and the inbox log entry is inserted within the *same* database transaction as the handler's business side effects.

#### Detailed Inbox Workflow
1. **Message Arrives**: RabbitMQ delivers a message envelope containing `OrderPlacedEvent` to the **Consumer Service**.
2. **De-duplication Check**: Before executing the event handler, the consumer queries the `inbox_messages` table:
   ```sql
   SELECT EXISTS(SELECT 1 FROM inbox_messages WHERE message_id = 'uuid' AND handler_name = 'ReserveInventoryHandler');
   ```
3. **Case A (Duplicate)**: If the query returns `true`, the consumer prints a warning, sends `basic.ack` to RabbitMQ, and terminates processing immediately. No business logic is run again.
4. **Case B (New Message)**: If the query returns `false`, the consumer starts a new database transaction.
    * It executes `ReserveInventoryHandler`, which updates the product stocks.
    * It inserts a log entry into `inbox_messages` recording the successful execution of `ReserveInventoryHandler` for this `message_id`.
    * It commits the transaction. If either the inventory update or the log entry insert fails, the whole transaction rolls back, and the message is not marked as processed, ensuring RabbitMQ can safely redeliver it.
5. **Final ACK**: The consumer sends a `basic.ack` to RabbitMQ, clearing the message from the queue.

#### Inbox Log Row Example
```json
{
  "id": "e81d7410-b9cc-432d-961e-841da92819cd",
  "message_id": "a5b81b22-83b6-4dfb-91cc-a720df38c5b0",
  "handler_name": "ReserveInventoryOnOrderPlacedHandler",
  "event_type": "OrderPlacedEvent",
  "created_at": "2026-06-26T10:25:01.000Z",
  "updated_at": "2026-06-26T10:25:01.000Z"
}
```

---

## 3. File-by-File Explanation

### 3.1 Core Event Contracts (`src/shared/domain/`)

#### `domain-event.interface.ts`
*   **What**: An interface defining the structure of a Domain Event (e.g., `OrderPlacedEvent`).
*   **Why**: Enforces uniformity. If every developer created events with different structures, writing a generic outbox relay or logger would be impossible.
*   **How**: All domain events must expose the date they occurred, their name, and their data properties.

#### `command.interface.ts` & `query.interface.ts`
*   **What**: Interfaces representing the inputs for Commands (intent to change state) and Queries (intent to read state).
*   **Why**: Implements the Command Query Responsibility Segregation (CQRS) pattern. It prevents the mixing of read-only logic with write/mutation logic, improving code maintainability.
*   **How**: Forces you to write clear, command-specific classes (e.g. `ShipOrderCommand`) which are then handled by dedicated handlers.

#### `message-envelope.interface.ts`
*   **What**: The standard JSON metadata envelope wrapped around all message payloads.
*   **Why**: Standardizes tracing, message identification, and validation across all services.
*   **How/Example**:
    ```typescript
    export interface MessageEnvelope<T = any> {
      messageId: string;      // Unique UUID for this message instance
      correlationId: string;  // Traces the entire flow across services
      causationId: string;    // ID of the message that caused this message
      eventType: string;      // e.g. "OrderPlacedEvent"
      occurredAt: string;     // ISO timestamp
      payload: T;             // Actual event data
    }
    ```

---

### 3.2 Database Persistence (`src/shared/infrastructure/`)

#### `inbox-message.entity.ts` & `outbox-message.entity.ts`
*   **What**: Database entities representing the schemas of the inbox and outbox tables.
*   **Why**: Bridges our TypeScript domain objects with the PostgreSQL database schema.
*   **How**: Implemented using MikroORM. We specify indices on `processed` (for outbox polling speed) and a unique composite key on `inbox_messages` (`message_id` + `handler_name`) to prevent race conditions at the database level.

#### `inbox-message.repository.ts` & `outbox-message.repository.ts`
*   **What**: Classes containing queries to load/save inbox and outbox records.
*   **Why**: Decouples SQL/ORM-specific queries from business logic.
*   **How**: Inherits from MikroORM's `EntityRepository`. For example, `OutboxMessageRepository` includes:
    ```typescript
    async findUnprocessed(limit: number): Promise<OutboxMessage[]> {
      return this.find({ processed: false }, {
        limit,
        orderBy: { createdAt: 'ASC' },
        // pessimistic write lock to prevent multiple relayer instances processing the same row
        lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL
      });
    }
    ```

---

### 3.3 RabbitMQ Core Engine (`src/shared/infrastructure/message-bus/rabbitmq/config/`)

#### `rabbitmq.interface.ts` & `rabbitmq-config.interface.ts`

Before writing a single line of connection or channel code, we define **what a valid RabbitMQ configuration looks like** in TypeScript. These interface files model everything: the connection options (host, port, heartbeat, vhost), the exchange config (name, type, durable), the queue config (name, prefetch count, DLQ arguments), and the binding config (routing key, binding key). Think of them as a contract — a schema that every configuration object must satisfy.

The reason this matters deeply is that RabbitMQ is an infrastructure system configured via raw string-based options at runtime. If you typo `durable` as `durrable`, amqplib silently ignores it and creates a non-durable queue. You won't discover this until after a RabbitMQ restart wipes your queues in production. With TypeScript interfaces enforcing the shape, the TypeScript compiler catches these mistakes at development time before the code is ever deployed. This is the difference between a bug caught in your IDE in 2 seconds vs. a production incident at 3am.

Additionally, these interfaces make the codebase self-documenting. Any developer reading the code immediately knows exactly what options the RabbitMQ module expects, without having to dig through `amqplib` docs or read the connection code.

---

#### `rabbitmq-config.service.ts` & `rabbitmq-runtime-config.service.ts`

These two services form a **two-layer configuration system**. The split between them is intentional and follows the Single Responsibility Principle — each service has one job.

`RabbitmqConfigService` is responsible purely for **reading and validating** configuration values from environment variables using NestJS's `ConfigService`. It answers questions like: what is the RabbitMQ URL? What is the prefetch count? How many retries should a failed message get? It does not know anything about connections or channels — that is not its job.

`RabbitmqRuntimeConfigService` takes the values from `RabbitmqConfigService` and **transforms them into the exact format** that `amqplib` needs to establish a connection. For example, `amqplib` requires a connection options object with specific keys like `heartbeat`, `frameMax`, and `hostname` separated from the `port`. It also parses the `RABBITMQ_URL` string into its individual components. This transformation layer means `RabbitmqConnectionService` (the actual connector) doesn't need to know anything about `.env` files or config loading — it just receives a ready-to-use options object.

The benefit of this split: when you want to write unit tests for the connection service, you can simply mock `RabbitmqRuntimeConfigService` and return a test config without needing a real `.env` file at all.

---

#### `rabbitmq-connection.service.ts`

This is arguably the **most critical file in the entire RabbitMQ setup**. It is the service that actually speaks to the RabbitMQ broker over a TCP socket using the AMQP 0-9-1 protocol via the `amqplib` library.

To understand why this file is complex, you need to understand what RabbitMQ's connection model looks like. A single **Connection** to RabbitMQ is a long-lived TCP socket. Inside that connection, you can open multiple **Channels** — lightweight virtual connections that are cheaper to create and can be created per-thread or per-operation. For our use case, we create one channel for publishing (with publisher confirmations enabled) and one channel for consuming.

The critical problem `amqplib` has out of the box: **it does not reconnect**. If your network hiccups for 5 seconds, the connection drops and your app permanently loses the ability to publish or consume. The connection service solves this by registering event listeners on both the connection and channels:

```typescript
connection.on('close', () => this.scheduleReconnect());
connection.on('error', (err) => this.logger.error('Connection error', err));
channel.on('close', () => this.recreateChannel());
```

When `close` fires, the service waits a few seconds (exponential backoff — 1s, 2s, 4s, up to a max) and then attempts to reconnect. Why exponential backoff? Because if RabbitMQ just restarted, hammering it with immediate reconnect attempts from 100 service instances simultaneously will overwhelm it. Gradually backing off gives the broker time to stabilize before clients reconnect.

Once reconnected, the service also re-triggers the `RabbitmqConfigurerService` to re-assert exchanges and queues, because in some RabbitMQ configurations (non-durable), topology can be lost on restart.

---

#### `rabbitmq-configurer.service.ts`

When a RabbitMQ consumer or producer starts up, it assumes that the exchanges and queues it wants to use already exist. If they don't, `amqplib` will throw an error like `"NOT_FOUND - no exchange 'order-exchange' in vhost '/'"`. The configurer service **eliminates this assumption** by asserting the full topology on every application startup.

To understand what "assert" means in RabbitMQ: `assertExchange()` and `assertQueue()` are idempotent operations. If the exchange or queue already exists with the same parameters, RabbitMQ does nothing. If it doesn't exist, RabbitMQ creates it. If it exists but with *different* parameters, RabbitMQ throws an error — which is actually what you want, because it means something changed unexpectedly.

The configurer sets up a three-tier resilience topology for every module:

**Tier 1 — Primary Exchange & Queue**: This is where normal messages flow. The exchange routes messages by `routing_key` (e.g. `order.placed`) to the correct queue using a `topic` exchange type. Topic exchanges support wildcard routing like `order.*` to match all order events.

**Tier 2 — Retry Exchange & Queue (Delayed TTL)**: When a consumer fails to process a message (e.g. a database timeout), we don't want to immediately redeliver it — the downstream problem might still be happening. Instead, the message is routed to a **retry queue** with the `x-message-ttl` argument set to (for example) 30 seconds. The retry queue has **no consumers**. After 30 seconds, the TTL expires and RabbitMQ automatically dead-letters the message back to the primary queue using `x-dead-letter-exchange`. The message gets a second chance, cleanly delayed without any cron jobs or timers in code.

**Tier 3 — Error Queue (Dead Letter Queue)**: If a message exhausts all retries (tracked via a retry count header the consumer increments), it is routed to the error queue. No more retries. An operator can inspect these messages in the RabbitMQ Management UI, fix the bug, and re-publish the messages manually if needed.

---

#### `rabbitmq.module.ts`

This is a **dynamic NestJS module** — a NestJS pattern where a module's providers, imports, and exports are determined at the time the module is imported, not when it is declared. This is the same pattern NestJS uses for `TypeOrmModule.forRoot()` or `ConfigModule.forRoot()`.

The reason we need a dynamic module here is that every domain module (Order, Payment, Inventory) will have a slightly different RabbitMQ configuration — different queue names, different prefetch counts, different exchange bindings. If `RabbitmqModule` was a static module, all modules would share one configuration, which is too rigid.

By calling `RabbitmqModule.forRoot({ queues: [...], exchange: '...' })`, each module passes its own configuration when importing. The dynamic module takes those options, creates a provider holding those options (using an injection token), and makes it available to `RabbitmqConfigService`, `RabbitmqConnectionService`, and `RabbitmqConfigurerService` within that module's DI scope. The result: the Order consumer worker has a completely independent RabbitMQ configuration from the Payment consumer worker, even though they share the same codebase.

---

### 3.4 Messaging Pipeline (`src/shared/infrastructure/message-bus/rabbitmq/`)

#### `producer.service.ts` & `producer.module.ts`

The producer service is the **sending side of the message bus**. Its job is to take a serialized message envelope and deliver it to RabbitMQ reliably. "Reliably" is the key word here — and this is where most beginners make a critical mistake.

When you call `channel.publish()` in `amqplib`, the method returns immediately with a boolean. Your message has been written to the Node.js network buffer, but it has not been confirmed by RabbitMQ. If RabbitMQ crashes in that split second, the message is lost with no indication of failure. This is a silent data loss bug.

We solve this by using a **Confirm Channel** (`channel.confirm()`) and **Publisher Confirmations**. In confirm mode, RabbitMQ sends back an acknowledgment (an `ACK`) for every message it successfully receives and writes to disk. Our producer wraps this in a Promise and only resolves once that `ACK` arrives. If RabbitMQ sends a `NACK` (meaning it failed to store the message), the Promise rejects and the caller can retry. This makes publishing fully reliable and gives us the guarantee we need before marking an outbox row as processed.

`producer.module.ts` exists as a NestJS wrapper so the `ProducerService` can be injected into other services like the outbox relay, without the consuming module needing to know anything about the underlying `amqplib` channel management.

---

#### `consumer.service.ts` & `consumer.module.ts`

The consumer service is the **receiving side of the message bus** — the part that listens on a RabbitMQ queue and reacts to incoming messages. Understanding how it works is essential to understanding at-least-once delivery and why idempotency is non-negotiable.

When a consumer calls `channel.consume(queueName, callback)`, it tells RabbitMQ: "Give me messages from this queue." RabbitMQ then pushes messages to the consumer as they arrive. The `prefetch` count we configure (e.g. `prefetch: 10`) limits how many unacknowledged messages RabbitMQ will send at once. This is crucial: without prefetch limiting, RabbitMQ could dump thousands of messages on a single consumer instance, overwhelming its memory.

When a message arrives in the callback, the service does not immediately acknowledge it. Instead it hands it off to `InboxMessageHandler` which runs the business logic inside a database transaction. Only after that transaction successfully commits does the service call `channel.ack(message)` — telling RabbitMQ the message has been safely processed and can be deleted from the queue.

If the handler throws an exception, the service calls `channel.nack(message, false, false)` with a `requeue: false` flag. This tells RabbitMQ not to put the message back on the same queue (which could create an infinite retry loop), but instead let the queue's `x-dead-letter-exchange` route it to the retry or error queue depending on the retry count header.

---

#### `signature-types.ts`

This small but important file solves a fundamental problem: **how does the consumer know which handler class to call for a given event type?**

In a strongly-typed system, we can't just store class constructors in a plain config object without some structure. `SignatureTypes` is a class whose sole purpose is to hold a map of event type strings (like `'OrderPlacedEvent'`) to the array of handler classes that care about that event. When the consumer receives a message with `eventType: 'OrderPlacedEvent'`, it looks up this registry and gets back `[ReserveInventoryHandler, CreateInvoiceHandler]`, then executes each one in sequence.

Why a class instead of a plain object? Because NestJS's Dependency Injection system works with class tokens. By wrapping it in a class and registering it as a provider, we can inject it where needed and also mock it in tests easily.

---

### 3.5 Messaging Orchestration (`src/shared/infrastructure/message-bus/`)

#### `lazy-load-handler.service.ts`

This service solves one of the trickiest architectural problems in modular NestJS applications: **circular dependencies**. To understand why it exists, consider this scenario:

- `SharedModule` needs to import `OrderModule` to get access to `ReserveInventoryHandler`.
- `OrderModule` needs to import `SharedModule` to get the database `EntityManager` and `OutboxMessageRepository`.

This creates a circular dependency: A → B → A. NestJS will throw an error at startup because it cannot determine which module to instantiate first. Even if you use `forwardRef()`, it's fragile and creates subtle injection-order bugs.

The `LazyLoadHandler` breaks this cycle entirely using NestJS's `LazyModuleLoader`. Instead of importing `OrderModule` statically at the module declaration level, we pass the `OrderModule` **class reference** (not an instance) as a token. When a message actually arrives at runtime, `LazyLoadHandler` calls `LazyModuleLoader.load(() => OrderModule)` which compiles and instantiates `OrderModule` dynamically, resolves the `ReserveInventoryHandler` from its DI container, and returns the live instance. The dependency is resolved at message-handling time, not at application startup time — completely sidestepping the circular import.

---

#### `message-destination-registry.ts`

When the outbox relay picks up a pending outbox message with `event_type: 'OrderPlacedEvent'`, it needs to know two things: which **exchange** to publish to, and which **routing key** to use. Hardcoding this in the relay service would mean the relay knows too much about domain-specific event routing — violating separation of concerns.

The `MessageDestinationRegistry` is a global singleton map that solves this. When the Order module registers its event destinations on startup (e.g. `registry.register('OrderPlacedEvent', { exchange: 'order-exchange', routingKey: 'order.placed' })`), the relay can later just do a lookup: `registry.getDestination(eventType)` and get back the routing information without knowing anything about the Order module itself.

Being a `@Global()` module means it is instantiated once and its registry instance is shared across the entire NestJS application, making it a safe, in-memory, single-source-of-truth for event routing configuration.

---

#### `inbox-message-handler.service.ts`

This service is the **central coordinator** that glues together idempotency checking, lazy handler resolution, and database transaction management into a single atomic operation. It is the file that makes the Transactional Inbox pattern actually work.

The sequence is strict: first, check if this `(messageId, handlerName)` pair already exists in the `inbox_messages` table. If it does, ACK and return — the work was already done. If not, open a MikroORM transaction. Within that transaction, call the resolved handler (via `LazyLoadHandler`). If the handler succeeds, insert the inbox log entry in the same transaction and commit. If the handler throws, the transaction rolls back, the inbox entry is never written, and the message can be safely redelivered.

The reason this atomicity matters: consider what happens if the handler succeeds but then the process crashes before the inbox entry is written. RabbitMQ redelivers the message. Without the atomic transaction guarantee, the handler would execute again, causing a duplicate side effect. With the transaction, either both the business effect and the inbox log commit together, or neither does.

---

#### `outbox-message-relay.service.ts`

This service is the **bridge between the database and the message broker**. The Transactional Outbox pattern is only useful if something actually reads the outbox and publishes the messages — that's this service's job.

The relay runs on a timer (or as a CLI command — see section 3.6). Each time it fires, it queries the `outbox_messages` table for records where `processed = false`, ordered oldest-first. Crucially, it uses `SELECT FOR UPDATE SKIP LOCKED`. The `FOR UPDATE` part places a pessimistic write lock on the rows it fetches. The `SKIP LOCKED` part tells PostgreSQL to skip any rows already locked by another relay instance. This means if you run 3 relay instances in parallel (for throughput), they naturally partition the work without duplicate publishing.

For each fetched row, the relay calls `ProducerService.publish()` and awaits the RabbitMQ publisher confirmation. Once confirmed, it immediately updates the row: `processed = true`, `processed_at = now()`. If the publish fails (RabbitMQ is down), the row stays `processed = false` and will be retried on the next relay cycle. This is how the outbox pattern guarantees eventual delivery.

---

### 3.6 CLI Commands (`src/shared/infrastructure/message-bus/cli-commands/`)

#### `command-handler.ts` & `module.map.ts`

By default, when you run a NestJS application, it starts an HTTP server and keeps it alive waiting for incoming web requests. But background workers — the outbox relay and the RabbitMQ consumer daemon — don't need an HTTP server. They need to boot NestJS's DI container, run a specific task, and either exit (CronJob) or keep running until killed (daemon).

`command-handler.ts` is the CLI entrypoint that makes this possible. Instead of calling `NestFactory.create()` which starts an HTTP server, it calls `CommandFactory.run()` from `nest-commander`, which boots the Nest DI container in a lightweight command mode. It reads the `--module` argument from `process.argv` (e.g. `--module order`) and looks up the corresponding NestJS module in `module.map.ts`.

`module.map.ts` is a simple key-value map: `{ order: OrderConsumerModule, payment: PaymentConsumerModule }`. This map is the entire registry of runnable worker modules. When you add a new domain module, you simply add it here. The command handler loads the mapped module and passes it to `CommandFactory`, which then discovers and runs the appropriate commander command inside it.

In Kubernetes, this translates directly to two manifest types:
- **CronJob** for `dispatch-messages`: Kubernetes schedules the pod to run on a cron schedule (e.g. every 30 seconds), the pod runs the outbox relay once, publishes all pending messages, and exits with code 0.
- **Deployment** for `handle-messages`: Kubernetes keeps the consumer pod running indefinitely, just like a regular service, but it has no HTTP port exposed — it only consumes from RabbitMQ.

#### `dispatch-messages.ts` & `handle-messages.ts`

These are the actual `nest-commander` command classes. In `nest-commander`, a command is a class decorated with `@Command({ name: 'dispatch-messages' })` that implements a `run()` method. When `CommandFactory` starts, it discovers all registered commands and matches the CLI argument to the correct one.

`dispatch-messages.ts` accepts `--module`, `--schema`, `--limit`, and `--continuous` options. When `--continuous` is passed, the relay loops indefinitely with a sleep between cycles. Without it, the relay runs exactly once and exits — the expected behaviour for a Kubernetes CronJob.

`handle-messages.ts` accepts `--module` and `--schema`. It starts the `ConsumerService` which calls `channel.consume()` and keeps the process alive listening for RabbitMQ messages. The process only exits if it receives a SIGTERM signal (e.g. when Kubernetes scales down the pod), at which point it cleanly closes the RabbitMQ channel and connection before exiting.

---

### 3.7 Global Exception System (`src/shared/infrastructure/http/exceptions/`)

#### `exceptions.ts`

In a clean architecture, your domain layer should have absolutely no dependency on the HTTP transport layer. The domain layer processes business logic — it should not know whether it's running inside an HTTP API, a CLI command, or a background consumer. Yet it still needs to signal error conditions upward.

The solution is **domain-specific exceptions** that extend plain JavaScript `Error`. We define a base `DomainException` class that all custom errors extend. From it, we derive `NotFoundException` (entity not found), `ConflictException` (business rule conflict, e.g. order already paid), and `DtoValidation` (invalid input data). These are pure TypeScript classes with no NestJS imports whatsoever.

This design means the same exception can be thrown from a RabbitMQ handler (where the response should be a `NACK`) or from an HTTP handler (where the response should be a `404 JSON body`) — the decision of how to handle it belongs to the transport layer, not the domain.

#### `strategy.ts` & `registry.ts`

Once a domain exception is thrown, something needs to translate it into an HTTP response. This is where the **Strategy** and **Registry** patterns come together.

`strategy.ts` defines the `MappingStrategy` class. It holds a map of exception class names to **error mapper** functions. When an exception arrives, the strategy looks up the error's class name, finds the mapper, calls `mapper.mapError(error)`, and gets back a structured object with `status`, `title`, `detail`, and `type` — the exact fields defined by RFC 7807.

`registry.ts` defines `CombinedMapperRegistryFactory` — a static accumulator where each domain module can register its own error mappers. For example, the Order module registers a mapper for `OrderNotFoundException` mapping it to `status: 404`. The Payment module registers a mapper for `PaymentAlreadyProcessedException` mapping it to `status: 409 Conflict`. When the global exception filter runs, it calls `CombinedMapperRegistryFactory.create()` to get all registered mappers combined, and passes them into `MappingStrategy`.

The power of this design: the shared layer knows nothing about domain-specific exceptions, yet every module can extend the global error handling without touching shared code.

#### `all-exception-filter.ts`

This is the **final safety net** for the entire HTTP layer. NestJS allows you to register a global exception filter using `app.useGlobalFilters()`. When any exception escapes all controller and service try/catch blocks, NestJS catches it and passes it to this filter.

The filter first attempts to map the exception using `MappingStrategy`. If a mapper is found (it's a known domain exception), it uses the mapped problem details to build the response. If no mapper is found but the exception is a NestJS `HttpException` (like `BadRequestException` thrown by the `ValidationPipe`), the filter extracts the status code and message from it and formats it into the RFC 7807 structure. If it's neither (a truly unexpected `Error`), the filter falls back to NestJS's default `BaseExceptionFilter`, which logs it and returns a generic 500.

The output is always consistent. A client consuming this API can rely on every error response having the same shape:

```json
{
  "status": 404,
  "title": "Not Found",
  "detail": "Order d748f219 was not found",
  "type": "/problem/NotFoundException",
  "instance": "/api/orders/d748f219"
}
```

This is a huge advantage for frontend teams and API consumers — they write one shared error handler for all API errors instead of handling different formats per endpoint.

---

## 4. CLI Command Usage

### 4.1 Run Message Dispatcher (Outbox Relay)
Runs the background outbox message dispatcher for a specific module, pulling messages from the database schema and publishing them to RabbitMQ.
```bash
# Run once (CronJob style)
npx ts-node src/shared/infrastructure/message-bus/cli-commands/command-handler.ts dispatch-messages --module order --schema public --limit 100

# Run continuously (Continuous Worker Daemon style)
npx ts-node src/shared/infrastructure/message-bus/cli-commands/command-handler.ts dispatch-messages --module order --schema public --continuous
```

### 4.2 Run Message Consumer (Daemon Worker)
Runs the daemon worker that listens on RabbitMQ queues and handles events dynamically.
```bash
npx ts-node src/shared/infrastructure/message-bus/cli-commands/command-handler.ts handle-messages --module order --schema public
```

---

## 5. Key Interview Questions & Answers

### Q1: What is the Dual-Write Problem, and how does the Transactional Outbox pattern solve it?
*   **Answer**: The dual-write problem occurs when a microservice needs to update a database and publish an event to a message broker. Because these are two separate network calls, they cannot participate in a single distributed transaction (2PC is slow and fragile). If the database write succeeds but the broker publish fails, other services never know about the change. 
The Transactional Outbox pattern solves this by persisting both the database changes and the event metadata (inside an `outbox_messages` table) in a **single local database transaction** using Unit of Work. A separate background worker (outbox relay) safely polls the outbox table and publishes the messages to the broker.

### Q2: Why is the Transactional Inbox pattern necessary, and how does it ensure idempotency?
*   **Answer**: Message brokers like RabbitMQ guarantee **at-least-once delivery**, which means network timeouts or client crashes after processing but before acknowledgment can lead to the broker delivering the same message multiple times.
The Transactional Inbox pattern ensures idempotency (processing a message once despite multiple deliveries) by logging every processed message ID along with the handler's name inside the database. Before executing any handler, the consumer queries this table. If a record is found, the message is acknowledged and skipped. If not, the handler is run and the log record is inserted in the same atomic database transaction.

### Q3: How do you handle circular dependency issues when injecting handlers into a generic consumer module in NestJS?
*   **Answer**: A circular dependency occurs if the messaging module imports the domain module to access its handlers, and the domain module imports the messaging module to publish events.
We resolve this using NestJS's `LazyModuleLoader` inside `LazyLoadHandler`. Instead of importing domain modules statically and injecting handlers via Nest's DI container at startup, the consumer receives the handler class reference. At runtime, the consumer queries the `LazyModuleLoader` to dynamically compile and resolve the handler's instance inside the current DI context, breaking the circular dependency loop.

### Q4: Explain the difference between publisher confirmations and consumer acknowledgments (ACK/NACK) in RabbitMQ.
*   **Answer**: 
    - **Publisher Confirmations**: Happen between the producer and RabbitMQ. When a producer sends a message, RabbitMQ sends an `ACK` back once it has safely persisted the message (or routed it to a queue). This ensures the producer knows the message was not lost in transit.
    - **Consumer Acknowledgments**: Happen between the consumer and RabbitMQ. The consumer tells RabbitMQ that it has successfully processed the message (`basic.ack`) so RabbitMQ can delete it. If processing fails, the consumer can send a `basic.nack` to reject the message, telling RabbitMQ to either delete it, redeliver it, or send it to a Dead Letter Queue (DLQ).

### Q5: What is a Dead Letter Queue (DLQ) and how does TTL retrying work?
*   **Answer**: A DLQ is a queue where RabbitMQ routes messages that cannot be processed successfully (e.g., due to code exceptions, validation issues, or maximum retry limits). 
In our design, when a consumer encounters an exception:
1. It retries the message immediately up to a limit (e.g., 3 times).
2. If it still fails, it routes the message to a **Delayed Retry Exchange** with a Message TTL (Time-To-Live). The message sits in the retry queue until the TTL expires, after which it is routed back to the primary queue for reprocessing.
3. If the message exceeds the maximum allowed retries, it is routed to the **Dead Letter/Error Queue** (Poison Queue) for manual operator analysis.

### Q6: What is RFC 7807 (Problem Details), and how does a custom Exception Filter help implement it?
*   **Answer**: RFC 7807 is an internet standard defining a machine-readable JSON format for HTTP API errors, providing consistent fields like `status`, `title`, `detail`, `type`, and `instance`.
In NestJS, we implement this using a global `ExceptionFilter` (`AllExceptionsFilter`). It catches all unhandled exceptions, uses a mapping strategy to map domain-specific errors (like `NotFoundException`) to appropriate HTTP statuses, and converts standard Nest HttpExceptions into the unified RFC 7807 structure, ensuring a consistent error API contract.
