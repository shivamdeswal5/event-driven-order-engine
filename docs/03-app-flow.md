# App Flow Document

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.2 | **Last Updated**: 2026-07-15 (ShipmentShippedEvent + operator ship/deliver flow)

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
      │               │               │               │  (Notification only)
      │               │               │               │  order stays PAID
      │               │               │               │               │
      │  Operator: POST /api/shipments/:orderId/ship                  │
      │               │               │               │               │
      │          [Outbox Relay publishes ShipmentShipped]             │
      │               │               │               │               │
      │               │ShipmentShipped│               │               │
      │               │<─────────────┼───────────────┼───────────────│
      │               │ update status │               │               │
      │               │ → SHIPPED     │               │               │
      │               │               │               │               │
      │  Operator: POST /api/shipments/:orderId/deliver               │
      │               │               │               │               │
      │          [Outbox Relay publishes ShipmentDelivered]           │
      │               │               │               │               │
      │               │ShipmentDelivered             │               │
      │               │<─────────────┼───────────────┼───────────────│
      │               │ update status │               │               │
      │               │ → DELIVERED   │               │               │
```

> **Notification Module** listens to ALL events and creates notifications at each step (omitted from diagram for clarity). After payment, the order stays **PAID** until the operator dispatches the shipment; only then does `ShipmentShippedEvent` move the order to **SHIPPED**.

---

## 2. HTTP API Flows

### 2.1 Order Module

#### POST /api/orders — Place Order

```
Request:
{
  "customerId": "customer-uuid",
  "items": [
    { "productId": "uuid-1", "quantity": 2, "price": 29.99 },
    { "productId": "uuid-2", "quantity": 1, "price": 49.99 }
  ]
}

Success (201):
{
  "message": "Order placed successfully.",
  "id": "order-uuid"
}

Error (400 — invalid input):
{
  "type": "validation-error",
  "title": "Bad Request",
  "status": 400,
  "detail": "customerId must be a UUID"
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
1. Validate DTO (automatic via ValidationPipe) — requires `customerId` (UUID) and `items[]` (`productId`, `quantity`, `price`)
2. Calculate the total price from the items
3. Create Order entity (starts `PENDING`) and call `order.place()` → status `PLACED`
4. Create OutboxMessage with the `OrderPlacedEvent` (item details live in the event payload, not on the order row)
5. `em.flush()` inside `@Transactional()` — atomic save of order + outbox message
6. Return `{ message, id }`

> **Note:** The persisted order stores only `customerId`, `totalPrice`, `status`, and `cancelReason`. There is no shipping address or line-item storage on the order itself; items travel in the event payload and are reserved by the Inventory module.

---

#### GET /api/orders/:id — Get Order

```
Success (200):
{
  "id": "order-uuid",
  "customerId": "customer-uuid",
  "totalPrice": 109.97,
  "status": "PAID",
  "cancelReason": null,
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
Query params: ?status=PLACED&limit=20&offset=0
  (status optional; limit 1-100 default 10; offset >= 0 default 0)

Success (200):
{
  "items": [...orders],
  "total": 45
}

Empty state (200):
{
  "items": [],
  "total": 0
}
```

---

#### POST /api/orders/:id/cancel — Cancel Order

```
Request (optional body):
{ "reason": "Customer changed their mind" }

Success (200):
{
  "message": "Order cancelled successfully."
}

Error (409 — already shipped):
{
  "type": "invalid-state-transition",
  "title": "Conflict",
  "status": 409,
  "detail": "Cannot cancel order in SHIPPED status"
}

Error (404):
{ "type": "order-not-found", "status": 404 }
```

**Handler Logic:**
1. Find order by ID (404 if not found)
2. Call `order.cancel(reason)` — allowed from `PENDING`, `PLACED`, or `PAID`; throws if already `SHIPPED`/`DELIVERED`; idempotent if already `CANCELLED`
3. Set status to `CANCELLED` and record `cancelReason`
4. Create OutboxMessage with the `OrderCancelledEvent`
5. `em.flush()` — atomic
6. Return `{ message }`

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

#### POST /api/shipments/:orderId/ship — Mark Shipment as Shipped

```
Request: { "carrier": "DHL", "trackingNumber": "DHL-123456789" }

Success (200): { "message": "Shipment marked as SHIPPED successfully." }
Error (409): { "detail": "Cannot perform action 'ship' on shipment ... in state 'SHIPPED'." }
```

**Handler Logic:**
1. Find shipment by `orderId` (404 if not found)
2. Call `shipment.ship(carrier, trackingNumber)` — requires status `PENDING`
3. Save shipment + outbox (`ShipmentShippedEvent`, routing key `shipping.shipped`) in one transaction
4. Order module consumes `ShipmentShippedEvent` asynchronously → order status → `SHIPPED`

#### POST /api/shipments/:orderId/deliver — Mark Shipment as Delivered

```
(no request body)

Success (200): { "message": "Shipment marked as DELIVERED successfully." }
Error (409): { "detail": "Cannot perform action 'deliver' on shipment ... in state 'PENDING'." }
```

**Handler Logic:**
1. Find shipment by `orderId`
2. Call `shipment.deliver()` — requires status `SHIPPED`
3. Save shipment + outbox (`ShipmentDeliveredEvent`, routing key `shipping.delivered`) in one transaction
4. Order module consumes `ShipmentDeliveredEvent` asynchronously → order status → `DELIVERED`

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

> **Order stays PAID** after this step. Shipment creation does not advance the order to `SHIPPED`.

### 3.4 ShipmentCreated Event Flow

```
ShipmentCreated event (routing key: shipping.created)
  └─→ Notification Module only
        - Save "Shipment provisioned" notification
        - Broadcast via WebSocket (targeted + saga firehose)
        - ACK

  (Order module does NOT consume this event — order remains PAID)
```

### 3.5 ShipmentShipped Event Flow (operator action)

```
Trigger: POST /api/shipments/:orderId/ship

ShipmentShipped event (routing key: shipping.shipped)
  ├─→ Order Module
  │     - Update order status → SHIPPED
  │     - ACK
  │
  └─→ Notification Module
        - Save "Shipment dispatched" notification
        - ACK
```

### 3.6 ShipmentDelivered Event Flow (operator action)

```
Trigger: POST /api/shipments/:orderId/deliver

ShipmentDelivered event (routing key: shipping.delivered)
  ├─→ Order Module
  │     - Update order status → DELIVERED
  │     - ACK
  │
  └─→ Notification Module
        - Save "Shipment delivered" notification
        - ACK
```

### 3.7 PaymentFailed Event Flow (Saga Compensation)

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

### 3.8 OrderCancelled Event Flow (Fanout)

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
Every N seconds (configurable via `OUTBOX_POLLING_INTERVAL_MS`, default 1000ms in dev):
  1. BEGIN TRANSACTION
  2. SELECT * FROM <module_schema>.outbox_messages
       WHERE processed = false
       ORDER BY created_at ASC
       LIMIT <batch size>
       FOR UPDATE SKIP LOCKED
  3. For each unprocessed message:
       a. Publish to RabbitMQ (exchange + routing key from message)
       b. Wait for publisher confirm
       c. If confirmed → set processed = true, processed_at = NOW()
       d. If NACK'd → leave unprocessed (retried on next poll), log error
  4. COMMIT TRANSACTION
  5. Any messages left unprocessed are picked up on the next poll
```

> The relay runs as a separate CLI process per module (`npm run dispatch-messages -- --module=<module>`), reading that module's own `outbox_messages` table.

---

## 6. Health Check Endpoint

#### GET /health

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
