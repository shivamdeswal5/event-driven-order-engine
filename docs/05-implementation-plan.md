# Implementation Plan

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.0 | **Last Updated**: 2026-06-30

---

## Phase Overview

| Phase | Name | Focus | Estimated Effort |
|-------|------|-------|-----------------|
| 1 | Project Setup | Docker, NestJS scaffold, DB connection | Foundation |
| 2 | Shared Infrastructure | Base entities, outbox/inbox, message bus, HTTP exceptions | Core plumbing |
| 3 | Order Module | First complete module with events | First domain module |
| 4 | Inventory Module | Stock management + event consumer | First inter-module flow |
| 5 | Payment Module | Payment processing + saga trigger | Saga starting point |
| 6 | Shipping Module | Shipment management | Near-complete flow |
| 7 | Notification Module | Event listener + notification log | Full flow complete |
| 8 | Saga & Compensation | Failure handling, fanout, rollback | Resilience |
| 9 | Retry, DLQ & Resilience | Retry queues, dead letters, chaos testing | Production readiness |
| 10 | Documentation & Polish | OpenAPI, AsyncAPI, health checks, seed data | Final polish |

---

## Phase 1: Project Setup & Infrastructure Foundation [DONE]

### Deliverables
- [x] Docker Compose with PostgreSQL, RabbitMQ, and backend service
- [x] Dockerfile (multi-stage build)
- [x] NestJS project initialized with TypeScript strict mode
- [x] MikroORM connected to PostgreSQL
- [x] Environment configuration (.env)
- [x] CORS configured
- [x] Global ValidationPipe configured
- [x] Project compiles and runs inside Docker

### Files Created
```
docker-compose.yml
docker-compose.dev.yml
Dockerfile
.env
.env.example
.dockerignore
.gitignore
package.json
tsconfig.json
tsconfig.build.json
mikro-orm.config.ts
src/main.ts
src/app.module.ts
src/shared/infrastructure/config/app.config.ts
src/shared/infrastructure/config/cors.config.ts
```

### Concepts Learned
- Docker multi-stage builds
- Docker Compose service orchestration
- NestJS application bootstrap
- MikroORM configuration
- Environment variable management

---

## Phase 2: Shared Infrastructure

### Deliverables
- [ ] Base entity class (id, createdAt, updatedAt)
- [ ] Domain event, command, query interfaces
- [ ] Message envelope interface
- [ ] OutboxMessage entity + repository
- [ ] InboxMessage entity + repository
- [ ] RabbitMQ connection service (amqplib)
- [ ] RabbitMQ producer service (with publisher confirms)
- [ ] RabbitMQ consumer service (with manual ACK)
- [ ] Message destination registry
- [ ] Outbox relay service (background poller)
- [ ] Inbox message handler service (dedup wrapper)
- [ ] Lazy-load handler service
- [ ] CLI command to setup exchanges/queues
- [ ] HTTP exception filter + mappers + registry
- [ ] First migration: outbox + inbox tables

### Files Created
```
src/shared/domain/common/base.entity.ts
src/shared/domain/common/domain-event.interface.ts
src/shared/domain/common/command.interface.ts
src/shared/domain/common/query.interface.ts
src/shared/domain/common/message-envelope.interface.ts
src/shared/domain/outbox/outbox-message.entity.ts
src/shared/infrastructure/repository/outbox/outbox-message.repository.ts
src/shared/domain/inbox/inbox-message.entity.ts
src/shared/infrastructure/repository/inbox/inbox-message.repository.ts
src/shared/infrastructure/message-bus/rabbitmq/config/rabbitmq.config.ts
src/shared/infrastructure/message-bus/rabbitmq/config/rabbitmq-connection.service.ts
src/shared/infrastructure/message-bus/rabbitmq/producer/rabbitmq-producer.service.ts
src/shared/infrastructure/message-bus/rabbitmq/consumer/rabbitmq-consumer.service.ts
src/shared/infrastructure/message-bus/message-destination-registry.ts
src/shared/infrastructure/message-bus/outbox-message-relay.service.ts
src/shared/infrastructure/message-bus/inbox-message-handler.service.ts
src/shared/infrastructure/message-bus/lazy-load-handler.service.ts
src/shared/infrastructure/message-bus/cli-commands/setup-message-bus.command.ts
src/shared/infrastructure/http/exceptions/all-exception.filter.ts
src/shared/infrastructure/http/exceptions/exceptions.ts
src/shared/infrastructure/http/exceptions/registry.ts
src/shared/infrastructure/http/exceptions/strategy.ts
src/shared/infrastructure/database/mikro-orm.module.ts
src/shared/shared.module.ts
migrations/Migration_*_CreateOutboxInboxTables.ts
```

### Concepts Learned
- Transactional outbox pattern implementation
- Transactional inbox pattern implementation
- amqplib connection, channels, confirms
- Background workers with NestJS intervals
- `SELECT FOR UPDATE SKIP LOCKED` for concurrent relay
- NestJS exception filters and mapping strategy
- Message envelope standardization

---

## Phase 3: Order Module

### Deliverables
- [x] Order entity with status state machine
- [x] OrderStatus enum
- [x] OrderPlaced and OrderCancelled events
- [x] Place Order feature (command + handler + DTO + route)
- [x] Get Order feature (query + handler + route)
- [x] List Orders feature (query + handler + route with pagination)
- [x] Cancel Order feature (command + handler + route)
- [x] Order message destination registration
- [x] Order exception mappers (OrderNotFound → 404, InvalidState → 409)
- [x] Order module registered in app
- [x] Migration: orders table
- [x] AsyncAPI contract for Order module

### Files Created
```
src/order/features/order.module.ts
src/order/asyncapi.yaml
src/order/domain/order/order.entity.ts
src/order/domain/order/enum/order-status.enum.ts
src/order/domain/order/enum-mapper/order-status-mapper.ts
src/order/domain/events/order-placed.event.ts
src/order/domain/events/order-cancelled.event.ts
src/order/domain/exceptions/exceptions.ts
src/order/features/place-order/place-order.module.ts
src/order/features/place-order/place-order.command.ts
src/order/features/place-order/place-order.handler.ts
src/order/features/place-order/place-order.controller.ts
src/order/features/place-order/place-order.dto.ts
src/order/features/get-order/get-order.module.ts
src/order/features/get-order/get-order.query.ts
src/order/features/get-order/get-order.handler.ts
src/order/features/get-order/get-order.controller.ts
src/order/features/list-orders/list-orders.module.ts
src/order/features/list-orders/list-orders.query.ts
src/order/features/list-orders/list-orders.handler.ts
src/order/features/list-orders/list-orders.controller.ts
src/order/features/cancel-order/cancel-order.module.ts
src/order/features/cancel-order/cancel-order.command.ts
src/order/features/cancel-order/cancel-order.handler.ts
src/order/features/cancel-order/cancel-order.controller.ts
src/order/infrastructure/message-bus/order.message-destination.ts
src/order/infrastructure/http/exceptions/registry.ts
src/order/infrastructure/http/exceptions/mappers.ts
migrations/Migration_*_CreateOrdersTable.ts
```

### Concepts Learned
- DDD entity design with state machine
- Vertical slice feature organization
- CQRS with .command.ts and .query.ts
- DTO validation with class-validator
- Outbox message creation in same transaction
- NestJS module structure

### Verification
- POST /api/orders → 201 + order in DB + outbox message created
- GET /api/orders/:id → 200 with order data
- GET /api/orders?status=PLACED → paginated list
- POST /api/orders/:id/cancel → 200 + status changed + outbox message
- Invalid input → 400 with ProblemDetails
- Non-existent order → 404

---

## Phase 4: Inventory Module [DONE]

### Deliverables
- [x] Product entity
- [x] InventoryReservation entity
- [x] Inventory events (Reserved, ReservationFailed, Released)
- [x] Add Product feature
- [x] Get Product / List Products features
- [x] Update Stock feature
- [x] Processor: handle OrderPlaced → reserve inventory
- [x] Processor: handle OrderCancelled → release inventory
- [x] Inventory consumer worker (subscribes to order-exchange)
- [x] Inventory message destination registration
- [x] Migration: products + inventory_reservations tables

### Concepts Learned
- First inter-module async communication
- Consumer processing with inbox dedup
- Inventory reservation/release pattern
- Event-driven stock management

### Verification
- Add products via API
- Place order → inventory auto-reserved (check stock decreased)
- Duplicate OrderPlaced message → processed once (inbox dedup)
- Cancel order → inventory released (stock increased back)

---

## Phase 5: Payment Module [DONE]

### Deliverables
- [x] Payment entity
- [x] Payment events (Completed, Failed)
- [x] Get Payment / List Payments features
- [x] Processor: handle InventoryReserved → process payment
- [x] Simulated payment logic (80/20 success/fail)
- [x] Payment consumer worker
- [x] Migration: payments table

### Concepts Learned
- Chain of events (Order → Inventory → Payment)
- Simulated external service integration
- Event fan-out from payment results
- Saga trigger point (PaymentFailed starts compensation)

### Verification
- Place order → inventory reserved → payment processed automatically
- ~80% payments succeed → PaymentCompleted event
- ~20% payments fail → PaymentFailed event (compensation starts)

---

## Phase 6: Shipping Module [DONE]

### Deliverables
- [x] Shipment entity
- [x] Shipping events (Created, Delivered)
- [x] Get Shipment / List Shipments features
- [x] Update Shipment Status feature
- [x] Processor: handle PaymentCompleted → create shipment
- [x] Processor: handle OrderCancelled → cancel shipment
- [x] Shipping consumer worker
- [x] Migration: shipments table

### Verification
- [x] Payment completed → shipment auto-created
- [x] Update shipment to DELIVERED → ShipmentDelivered event
- [x] Order cancelled → shipment cancelled

---

## Phase 7: Notification Module [DONE]

### Deliverables
- [x] Notification entity
- [x] List Notifications / Get by Order features
- [x] Processors for ALL events (OrderPlaced, PaymentCompleted, PaymentFailed, ShipmentCreated, ShipmentDelivered, OrderCancelled)
- [x] Notification consumer worker (subscribes to ALL exchanges)
- [x] WebSocket room subscription and real-time event broadcasting
- [x] Migration: notifications table

### Verification
- [x] Every lifecycle event generates a notification
- [x] GET /api/notifications/:orderId shows complete history
- [x] WebSocket clients receive instant notifications when subscribed to order room

---

## Phase 8: Saga & Compensation [DONE]

### Deliverables
- [x] OrderCancelled fanout exchange setup
- [x] All modules react to OrderCancelled via fanout
- [x] PaymentFailed → release inventory → cancel order → notify
- [x] InventoryReservationFailed → cancel order → notify
- [x] User-initiated cancel → OrderCancelled fanout → all modules compensate
- [x] Correlation tracing across saga flow

### Concepts Learned
- Choreography saga implementation
- Fanout exchange for global events
- Compensation flow design
- correlationId-based tracing

### Verification
- [x] Force payment failure → inventory released + order cancelled + notification
- [x] Cancel order manually → all modules react via fanout
- [x] Query by correlationId shows complete saga flow

---

## Phase 9: Retry, DLQ & Resilience Testing [DONE]

### Deliverables
- [x] Retry exchange + retry queues with TTL (exponential backoff)
- [x] DLX exchange + DLQ per module
- [x] Retry count tracking in message headers
- [x] NACK + routing to retry/DLQ based on retry count
- [x] Outbox relay with `FOR UPDATE SKIP LOCKED`
- [x] Structured logging with correlationId

### Resilience Tests
- [x] Stop RabbitMQ → outbox messages accumulate → restart → messages published
- [x] Kill consumer mid-processing → message re-delivered (no ACK)
- [x] Send duplicate message → processed once (inbox)
- [x] Poison message → retried 5 times → lands in DLQ
- [x] Concurrent outbox relay → SKIP LOCKED prevents double publish

---

## Phase 10: Documentation & Polish [DONE]

### Deliverables
- [x] Swagger (OpenAPI) setup with static definitions
- [x] All endpoints documented with clear request/response models
- [x] AsyncAPI yaml files for all 5 modules
- [x] Health check endpoint (DB + RabbitMQ)
- [x] Seed data command (sample products, test orders)
- [x] README with setup instructions, architecture overview, CLI producer/consumer commands
- [x] Final round of testing all flows

### Verification
- [x] Health check returns correct status
- [x] Seed data creates testable state
- [x] Full happy path works end-to-end
- [x] Full compensation path works end-to-end
