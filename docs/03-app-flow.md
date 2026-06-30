# App Flow Document

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.0 | **Last Updated**: 2026-06-25

---

## 1. Complete Order Lifecycle — Happy Path

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client   │    │   Order   │    │Inventory │    │ Payment  │    │ Shipping │
│ (API)     │    │  Module   │    │  Module  │    │  Module  │    │  Module  │
└─────┬────┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
      │               │               │               │               │
      │ POST /orders  │               │               │               │
      │──────────────>│               │               │               │
      │               │ save order    │               │               │
      │               │ + outbox msg  │               │               │
      │               │ (atomic tx)   │               │               │
      │  201 Created  │               │               │               │
      │<──────────────│               │               │               │
      │               │               │               │               │
      │          [Outbox Relay polls, publishes OrderPlaced]          │
      │               │               │               │               │
      │               │  OrderPlaced  │               │               │
      │               │──────────────>│               │               │
      │               │               │ check stock   │               │
      │               │               │ reserve items  │               │
      │               │               │ + outbox msg  │               │
      │               │               │               │               │
      │          [Outbox Relay publishes InventoryReserved]           │
      │               │               │               │               │
      │               │               │ InventoryReserved             │
      │               │               │──────────────>│               │
      │               │               │               │ process payment│
      │               │               │               │ + outbox msg  │
      │               │               │               │               │
      │          [Outbox Relay publishes PaymentCompleted]            │
      │               │               │               │               │
      │               │PaymentCompleted│              │               │
      │               │<──────────────┼──────────────│               │
      │               │ update status │               │               │
      │               │ → PAID        │               │               │
      │               │               │               │PaymentCompleted
      │               │               │               │──────────────>│
      │               │               │               │               │ create
      │               │               │               │               │ shipment
      │               │               │               │               │
      │          [Outbox Relay publishes ShipmentCreated]             │
      │               │               │               │               │
      │               │ShipmentCreated│               │               │
      │               │<─────────────┼───────────────┼───────────────│
      │               │ update status │               │               │
      │               │ → SHIPPING    │               │               │
```

> **Notification Module** listens to ALL events and creates notifications at each step (omitted from diagram for clarity).

---

## 2. HTTP API Flows

### 2.1 Order Module

#### POST /api/orders — Place Order

```
Request:
{
  "customerEmail": "user@example.com",
  "items": [
    { "productId": "uuid-1", "quantity": 2, "unitPrice": 29.99 },
    { "productId": "uuid-2", "quantity": 1, "unitPrice": 49.99 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "73301",
    "country": "US"
  }
}

Success (201):
{
  "id": "order-uuid",
  "status": "PLACED",
  "customerEmail": "user@example.com",
  "items": [...],
  "totalAmount": 109.97,
  "createdAt": "2026-06-25T10:00:00Z"
}

Error (400 — invalid input):
{
  "type": "validation-error",
  "title": "Bad Request",
  "status": 400,
  "detail": "items must contain at least 1 element"
}

Error (409 — product not found):
{
  "type": "product-not-found",
  "title": "Conflict",
  "status": 409,
  "detail": "Product 'uuid-999' does not exist"
}
```

**Handler Logic:**
1. Validate DTO (automatic via ValidationPipe)
2. Calculate totalAmount from items
3. Create Order entity with status `PLACED`
4. Create OutboxMessage with `OrderPlaced` event
5. `em.flush()` — atomic save of order + outbox message
6. Return created order

---

#### GET /api/orders/:id — Get Order

```
Success (200):
{
  "id": "order-uuid",
  "status": "PAID",
  "customerEmail": "user@example.com",
  "items": [...],
  "totalAmount": 109.97,
  "createdAt": "...",
  "updatedAt": "..."
}

Error (404):
{
  "type": "order-not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Order with ID 'order-uuid' not found"
}
```

---

#### GET /api/orders — List Orders

```
Query params: ?status=PLACED&page=1&limit=20

Success (200):
{
  "data": [...orders],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}

Empty state (200):
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

---

#### POST /api/orders/:id/cancel — Cancel Order

```
Success (200):
{
  "id": "order-uuid",
  "status": "CANCELLING",
  "message": "Order cancellation initiated"
}

Error (409 — already shipped):
{
  "type": "invalid-state-transition",
  "title": "Conflict",
  "status": 409,
  "detail": "Cannot cancel order in SHIPPING status"
}

Error (404):
{ "type": "order-not-found", "status": 404 }
```

**Handler Logic:**
1. Find order by ID (404 if not found)
2. Validate state transition (only PLACED, INVENTORY_RESERVED, PAYMENT_PROCESSING can cancel)
3. Set status to `CANCELLING`
4. Create OutboxMessage with `OrderCancelled` event
5. `em.flush()` — atomic
6. Return updated order

---

### 2.2 Inventory Module

#### POST /api/products — Add Product

```
Request:
{ "name": "Wireless Mouse", "sku": "WM-001", "stockQuantity": 100, "unitPrice": 29.99 }

Success (201):
{ "id": "product-uuid", "name": "Wireless Mouse", "sku": "WM-001", "stockQuantity": 100, ... }

Error (409): { "type": "duplicate-sku", "detail": "SKU 'WM-001' already exists" }
```

#### GET /api/products/:id — Get Product
#### GET /api/products — List Products

#### PATCH /api/products/:id/stock — Update Stock

```
Request: { "adjustment": 50 }   // positive = add, negative = deduct

Success (200): { "id": "...", "stockQuantity": 150 }
Error (409): { "detail": "Insufficient stock. Available: 10, requested deduction: -20" }
```

---

### 2.3 Payment Module

#### GET /api/payments/:orderId — Get Payment
#### GET /api/payments — List Payments (with status filter)

---

### 2.4 Shipping Module

#### GET /api/shipments/:orderId — Get Shipment
#### GET /api/shipments — List Shipments

#### PATCH /api/shipments/:id/status — Update Shipment Status

```
Request: { "status": "DELIVERED" }

Success (200): { "id": "...", "status": "DELIVERED", "deliveredAt": "..." }
Error (409): { "detail": "Cannot transition from DELIVERED to SHIPPED" }
```

---

### 2.5 Notification Module

#### GET /api/notifications — List All Notifications
#### GET /api/notifications/:orderId — Get Notifications by Order

---

## 3. Event-Driven Flows (Async)

### 3.1 OrderPlaced Event Flow

```
Trigger: POST /api/orders (successful)

OrderPlaced event
  ├─→ Inventory Module
  │     1. Check inbox — already processed? Skip
  │     2. Find products for order items
  │     3. Check stock availability for ALL items
  │     4. If ALL available:
  │     │    - Deduct stock for each item
  │     │    - Save inbox record + outbox (InventoryReserved)
  │     │    - ACK message
  │     5. If ANY unavailable:
  │          - Save inbox record + outbox (InventoryReservationFailed)
  │          - ACK message
  │
  ├─→ Notification Module
  │     1. Save "Order Confirmation" notification to DB
  │     2. ACK message
  │
  └─→ (No other modules subscribe to OrderPlaced directly)
```

### 3.2 InventoryReserved Event Flow

```
InventoryReserved event
  └─→ Payment Module
        1. Check inbox — already processed? Skip
        2. Create Payment record with status PROCESSING
        3. Simulate payment (80% success / 20% fail)
        4. If success:
        │    - Update payment status to COMPLETED
        │    - Save outbox (PaymentCompleted)
        5. If failure:
             - Update payment status to FAILED
             - Save outbox (PaymentFailed)
        6. ACK message
```

### 3.3 PaymentCompleted Event Flow

```
PaymentCompleted event
  ├─→ Order Module
  │     - Update order status → PAID
  │     - ACK
  │
  ├─→ Shipping Module
  │     - Create shipment with status PENDING
  │     - Save outbox (ShipmentCreated)
  │     - ACK
  │
  └─→ Notification Module
        - Save "Payment Receipt" notification
        - ACK
```

### 3.4 PaymentFailed Event Flow (Saga Compensation)

```
PaymentFailed event
  ├─→ Inventory Module (COMPENSATION)
  │     - Find reserved items for this order
  │     - Release stock (add back quantities)
  │     - Save outbox (InventoryReleased)
  │     - ACK
  │
  ├─→ Order Module (COMPENSATION)
  │     - Update order status → CANCELLED
  │     - Save outbox (OrderCancelled) to FANOUT exchange
  │     - ACK
  │
  └─→ Notification Module
        - Save "Payment Failed" notification
        - ACK
```

### 3.5 OrderCancelled Event Flow (Fanout)

```
OrderCancelled event (FANOUT — all modules receive)
  ├─→ Inventory Module
  │     - Release any reserved stock
  │     - ACK
  │
  ├─→ Payment Module
  │     - If payment exists and completed → create refund record
  │     - ACK
  │
  ├─→ Shipping Module
  │     - If shipment exists and pending → cancel shipment
  │     - ACK
  │
  └─→ Notification Module
        - Save "Order Cancelled" notification
        - ACK
```

---

## 4. Retry & DLQ Flow

```
Message arrives at consumer
  │
  ├─ Process succeeds → ACK → done
  │
  └─ Process fails
       │
       ├─ retryCount < 5
       │     NACK → message goes to retry queue (TTL = 2^retryCount * 1000ms)
       │     TTL expires → message re-routed back to main queue
       │     retryCount incremented in headers
       │
       └─ retryCount >= 5
             NACK → message goes to Dead Letter Queue
             Logged as permanent failure
             Available for manual inspection via RabbitMQ Management UI
```

---

## 5. Outbox Relay Flow

```
Every 5 seconds (configurable):
  1. BEGIN TRANSACTION
  2. SELECT * FROM outbox_messages
       WHERE published_at IS NULL
       ORDER BY created_at ASC
       LIMIT 100
       FOR UPDATE SKIP LOCKED
  3. For each unpublished message:
       a. Publish to RabbitMQ (exchange + routing key from message)
       b. Wait for publisher confirm
       c. If confirmed → set published_at = NOW()
       d. If NACK'd → increment retry_count, log error
  4. COMMIT TRANSACTION
  5. If any messages failed, they'll be picked up on next poll
```

---

## 6. Health Check Endpoint

#### GET /api/health

```
Success (200):
{
  "status": "healthy",
  "timestamp": "2026-06-30T11:21:57.102Z",
  "details": {
    "database": { "status": "up" },
    "rabbitmq": { "status": "up" }
  }
}

Unhealthy (503):
{
  "status": "unhealthy",
  "timestamp": "2026-06-30T11:21:57.102Z",
  "details": {
    "database": { "status": "up" },
    "rabbitmq": { "status": "down", "error": "Connection refused" }
  }
}
```
