# Product Requirements Document (PRD)

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.0 | **Last Updated**: 2026-06-25

---

## 1. App Overview

A **backend-only** event-driven order fulfillment engine that processes the complete lifecycle of an order — from placement to shipping — using asynchronous communication powered by RabbitMQ.

The system is a **modular monolith** where 5 independent domain modules (Order, Inventory, Payment, Shipping, Notification) communicate exclusively through domain events. It demonstrates production-grade resilience patterns including Transactional Outbox/Inbox, Saga compensation, retry with backoff, and Dead Letter Queues.

---

## 2. Target Users

| User Type | Description |
|-----------|-------------|
| Backend Developers | Learning DDD, event-driven architecture, resilience patterns |
| Engineering Teams | Evaluating modular monolith patterns |
| System Design Learners | Preparing for system design interviews |
| API Consumers | Interacting via REST API + Swagger UI |

---

## 3. Problem Statement

Traditional monolithic order systems suffer from:
1. **Tight coupling** — modules call each other directly
2. **Synchronous failures** — slow Payment blocks entire order flow
3. **Data inconsistency** — crash between DB write and event publish
4. **No failure recovery** — failed payment leaves inventory reserved forever
5. **Duplicate processing** — message redelivery causes double deductions
6. **No observability** — impossible to trace order across modules

---

## 4. Core Features by Module

### 4.1 Order Module

| Feature | Endpoint |
|---------|----------|
| Place Order | `POST /api/orders` |
| Get Order | `GET /api/orders/:id` |
| List Orders | `GET /api/orders` |
| Cancel Order | `POST /api/orders/:id/cancel` |
| Get Order Status | `GET /api/orders/:id/status` |

**Publishes**: `OrderPlaced`, `OrderCancelled` (fanout)
**Consumes**: `PaymentCompleted`, `PaymentFailed`, `ShipmentCreated`, `ShipmentDelivered`

**Order Status State Machine:**
```
PLACED → INVENTORY_RESERVED → PAYMENT_PROCESSING → PAID → SHIPPING → DELIVERED
  │              │                    │
  ▼              ▼                    ▼
CANCELLED   CANCELLED           PAYMENT_FAILED → CANCELLING → CANCELLED
```

### 4.2 Inventory Module

| Feature | Endpoint |
|---------|----------|
| Add Product | `POST /api/products` |
| Get Product | `GET /api/products/:id` |
| List Products | `GET /api/products` |
| Update Stock | `PATCH /api/products/:id/stock` |

**Publishes**: `InventoryReserved`, `InventoryReservationFailed`, `InventoryReleased`
**Consumes**: `OrderPlaced`, `OrderCancelled`, `PaymentFailed`

### 4.3 Payment Module

| Feature | Endpoint |
|---------|----------|
| Get Payment | `GET /api/payments/:orderId` |
| List Payments | `GET /api/payments` |

> Payment processing is triggered by events only (`InventoryReserved`), not direct API calls.

**Publishes**: `PaymentCompleted`, `PaymentFailed`
**Consumes**: `InventoryReserved`

Simulated: 80% success, 20% failure (configurable).

### 4.4 Shipping Module

| Feature | Endpoint |
|---------|----------|
| Get Shipment | `GET /api/shipments/:orderId` |
| List Shipments | `GET /api/shipments` |
| Update Status | `PATCH /api/shipments/:id/status` |

**Publishes**: `ShipmentCreated`, `ShipmentDelivered`
**Consumes**: `PaymentCompleted`, `OrderCancelled`

### 4.5 Notification Module

| Feature | Endpoint |
|---------|----------|
| List Notifications | `GET /api/notifications` |
| By Order | `GET /api/notifications/:orderId` |

> Event-driven only. Notifications logged to DB (no real email/SMS in V1).

**Consumes**: `OrderPlaced`, `PaymentCompleted`, `PaymentFailed`, `ShipmentCreated`, `ShipmentDelivered`, `OrderCancelled`

---

## 5. Cross-Cutting Features

| Feature | Description |
|---------|-------------|
| Transactional Outbox | Events saved atomically with business data |
| Transactional Inbox | Duplicate detection + idempotent processing |
| Outbox Relay Worker | Background poller: outbox → RabbitMQ |                        
| Health Checks | DB, RabbitMQ, relay lag verification |
| Structured Logging | JSON logs with correlationId |

---

## 6. User Stories

- **US-01**: Place order → fulfillment process begins
- **US-02**: View order status across the pipeline
- **US-03**: Cancel pending order → system reverses all actions
- **US-04**: List orders with pagination
- **US-05**: Add products with stock quantities
- **US-06**: View current stock levels
- **US-07**: Inventory auto-reserved on order placement
- **US-08**: Inventory auto-released on failure/cancellation
- **US-09**: Payment auto-processed on inventory reservation
- **US-10**: View payment status for any order
- **US-11**: Payment failure triggers compensation (release + cancel)
- **US-12**: Shipment auto-created on payment success
- **US-13**: Update shipment status (shipped → delivered)
- **US-14**: Pending shipments cancelled on order cancellation
- **US-15**: Notifications auto-generated for every lifecycle event
- **US-16**: View all notifications for a specific order
- **US-17**: Zero message loss even during broker restart
- **US-18**: Duplicate messages processed exactly once
- **US-19**: Failed messages retried with backoff → DLQ
- **US-20**: Partial failures trigger compensating actions

---

## 7. Saga Compensation Scenarios

| Scenario | Trigger | Compensating Actions |
|----------|---------|---------------------|
| Payment fails | `PaymentFailed` | Release inventory → Cancel order → Notify |
| Insufficient stock | `InventoryReservationFailed` | Cancel order → Notify |
| User cancels | `OrderCancelled` (fanout) | Release inventory → Refund → Cancel shipment → Notify |

---

## 8. MVP Scope

### ✅ In Scope
- All 5 modules with full event-driven communication
- Outbox + Inbox patterns
- Choreography Saga with compensation
- Retry + DLQ + Publisher confirms + Manual ACK
- OpenAPI + AsyncAPI documentation
- Docker + Docker Compose
- Structured logging + Health checks
- Seed data for testing

### ❌ Out of Scope (V1)
- Frontend UI
- Real payment gateway (Stripe, PayPal)
- Real notifications (SendGrid, Twilio)
- Authentication / Authorization
- Multi-tenancy, Rate limiting, Caching
- WebSocket real-time updates
- CI/CD, Kubernetes, Load testing

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Zero message loss | No events lost during broker restart |
| Exactly-once processing | Duplicates handled idempotently |
| Saga compensation | Full rollback within 30 seconds |
| Correlation tracing | Order traceable across all modules |
| Retry resilience | Transient failures recovered in 5 attempts |
| API documentation | 100% endpoints in Swagger |
| Event contracts | All events in AsyncAPI |
