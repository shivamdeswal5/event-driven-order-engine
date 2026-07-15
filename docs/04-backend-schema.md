# Backend Schema Document

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.2 | **Last Updated**: 2026-07-15 (ShipmentShippedEvent saga correction)

---

## 1. Database Overview

- **Engine**: PostgreSQL 16
- **ORM**: MikroORM 6.x
- **Single database**, **one schema per module** (`order_schema`, `inventory_schema`, `payment_schema`, `shipping_schema`, `notification_schema`), configured via `DB_SCHEMA_*` env vars
- **UUID primary keys** (generated in the application layer, not via a DB default)
- **JSON** columns for event payloads (outbox `payload`)
- Enum-typed columns (e.g. order/payment `status`) are stored as **INTEGER** and mapped to their string enum in the domain layer

---

## 2. Shared Infrastructure Tables (per module)

> **Implementation note:** The outbox/inbox pattern is defined in the `shared` module (`OutboxMessage` / `InboxMessage` entities under `modules/shared/src/domain/`), but the tables are **created and stored inside each module's own schema** — there is one `outbox_messages` and one `inbox_messages` table per module schema (`order_schema.outbox_messages`, `inventory_schema.outbox_messages`, etc.). There is no central `shared_schema` for these tables. Each module's migrations create them (e.g. `modules/order/src/infrastructure/database/migrations/1710000000002-create-outbox.ts`).

### 2.1 outbox_messages

Stores events that need to be published to RabbitMQ. Written in the same transaction as business data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique message ID (app-generated) |
| event_type | VARCHAR(255) | NOT NULL | Event name: `OrderPlacedEvent` |
| payload | JSON | NOT NULL | Full MessageEnvelope (serialized) |
| exchange | VARCHAR(255) | NOT NULL | Target exchange: `order-exchange` |
| routing_key | VARCHAR(255) | NOT NULL | RabbitMQ routing key: `order.placed` |
| correlation_id | VARCHAR(255) | NOT NULL | Saga correlation ID |
| causation_id | VARCHAR(255) | NULL | ID of the event that caused this |
| processed | BOOLEAN | NOT NULL, DEFAULT false | `false` = not yet published by the relay |
| processed_at | TIMESTAMP | NULL | When the relay published it |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | When the message was created |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update time |

**Indexes:** Primary key only. The relay polls unprocessed rows with `WHERE processed = false` using `SELECT ... FOR UPDATE SKIP LOCKED` ordered by `created_at`.

---

### 2.2 inbox_messages

Records processed messages to achieve idempotent consumption (exactly-once semantics).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Row ID (app-generated) |
| message_id | UUID | NOT NULL | Original message ID from producer |
| handler_name | VARCHAR(255) | NOT NULL | Which processor handled it |
| event_type | VARCHAR(255) | NOT NULL | Event type processed |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | When it was processed |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update time |

**Indexes:**
- `uq_inbox_message_handler` — UNIQUE `(message_id, handler_name)` (composite key for dedup)

**Note:** `message_id + handler_name` is the dedup key because the same event can be processed by multiple handlers within one module.

---

## 3. Order Module Tables

### 3.1 orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Order ID (app-generated) |
| customer_id | UUID | NOT NULL | Customer identifier |
| total_price | DECIMAL(10,2) | NOT NULL | Order total |
| status | INTEGER | NOT NULL, DEFAULT 0 | Current order status (integer-mapped enum, `0 = PENDING`) |
| cancel_reason | VARCHAR(255) | NULL | Reason for cancellation |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Order creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update time |

**Indexes:** Primary key only (no secondary indexes defined in the current migration).

> **Note on order items:** The persisted `orders` row does **not** store line items or a shipping address. Item details (product id, quantity, price) travel only inside the event payloads (e.g. `OrderPlacedEvent`) and are owned/reserved by the Inventory module. The order aggregate keeps just the `customer_id`, `total_price`, and lifecycle `status`.

**Order Status Enum** (`modules/order/src/domain/order/enum/order-status.enum.ts`, stored as INTEGER via `OrderStatusMapper`):
```typescript
enum OrderStatus {
  PENDING = 'PENDING',
  PLACED = 'PLACED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}
```

**Valid State Transitions** (enforced by methods on the `Order` entity):
```
PENDING → PLACED           (place)     — synchronous in POST /api/orders
PLACED  → PAID             (pay)       — async via PaymentCompletedEvent
PAID    → SHIPPED          (ship)      — async via ShipmentShippedEvent (operator POST /ship)
SHIPPED → DELIVERED        (deliver)   — async via ShipmentDeliveredEvent (operator POST /deliver)
PENDING | PLACED | PAID → CANCELLED   (cancel; not allowed once SHIPPED/DELIVERED)
```

> **Important:** `ShipmentCreatedEvent` (emitted when payment completes and a shipment row is created in `PENDING` state) does **not** transition the order to `SHIPPED`. The order stays `PAID` until the operator calls `POST /api/shipments/:orderId/ship`, which emits `ShipmentShippedEvent`.

---

## 4. Inventory Module Tables

### 4.1 products

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Product ID |
| name | VARCHAR(255) | NOT NULL | Product name |
| sku | VARCHAR(100) | NOT NULL, UNIQUE | Stock keeping unit |
| stock_quantity | INT | NOT NULL, DEFAULT 0, CHECK >= 0 | Available stock |
| reserved_quantity | INT | NOT NULL, DEFAULT 0, CHECK >= 0 | Currently reserved |
| unit_price | DECIMAL(12,2) | NOT NULL | Price per unit |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `uq_products_sku` — UNIQUE `(sku)`
- `idx_products_name` — `(name)` (search)

### 4.2 inventory_reservations

Tracks which stock is reserved for which order (for compensation/release).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Reservation ID |
| order_id | UUID | NOT NULL | Which order reserved this |
| product_id | UUID | NOT NULL, FK → products.id | Which product |
| quantity | INT | NOT NULL | How many reserved |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'RESERVED' | RESERVED, RELEASED, DEDUCTED |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| released_at | TIMESTAMP | NULL | When released (if applicable) |

**Indexes:**
- `idx_reservations_order` — `(order_id)` (find all reservations for an order)
- `idx_reservations_product` — `(product_id)` (find reservations per product)
- `idx_reservations_status` — `(status)` (filter active reservations)

### 4.3 seeds

Tracks the execution of idempotent database seeders within the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| name | VARCHAR(255) | PK | Unique name of the seeder (e.g. 'ProductSeeder') |
| seeded_at | TIMESTAMP | DEFAULT NOW() | Timestamp when the seeding completed |

---

## 5. Payment Module Tables

### 5.1 payments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Payment ID |
| order_id | UUID | NOT NULL, UNIQUE | One payment per order |
| amount | DECIMAL(12,2) | NOT NULL | Payment amount |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'USD' | Currency code |
| status | INT | NOT NULL, DEFAULT 0 | Payment status (0: PENDING, 1: PROCESSING, 2: COMPLETED, 3: FAILED, 4: REFUNDED) |
| failure_reason | VARCHAR(500) | NULL | Why payment failed |
| processed_at | TIMESTAMP | NULL | When payment was processed |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `uq_payments_order` — UNIQUE `(order_id)`
- `idx_payments_status` — `(status)`

**Payment Status Enum:**
```typescript
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
```

---

## 6. Shipping Module Tables

### 6.1 shipments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Shipment ID |
| order_id | UUID | NOT NULL, UNIQUE | One shipment per order |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'PENDING' | Shipment status |
| shipping_address | JSONB | NOT NULL | Delivery address |
| tracking_number | VARCHAR(100) | NULL | Tracking number (simulated) |
| shipped_at | TIMESTAMP | NULL | When shipped |
| delivered_at | TIMESTAMP | NULL | When delivered |
| cancelled_at | TIMESTAMP | NULL | When cancelled |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `uq_shipments_order` — UNIQUE `(order_id)`
- `idx_shipments_status` — `(status)`

**Shipment Status Enum:**
```typescript
enum ShipmentStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
```

---

## 7. Notification Module Tables

### 7.1 notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Notification ID |
| order_id | UUID | NOT NULL | Related order |
| type | VARCHAR(100) | NOT NULL | Notification type |
| channel | VARCHAR(50) | NOT NULL, DEFAULT 'EMAIL' | EMAIL, SMS (simulated) |
| recipient | VARCHAR(255) | NOT NULL | Email or phone |
| subject | VARCHAR(255) | NOT NULL | Notification subject |
| body | TEXT | NOT NULL | Notification body |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'SENT' | SENT, FAILED |
| sent_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:**
- `idx_notifications_order` — `(order_id)` (all notifications for order)
- `idx_notifications_type` — `(type)` (filter by type)

**Notification Type Enum:**
```typescript
enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SHIPPING_UPDATE = 'SHIPPING_UPDATE',
  DELIVERY_CONFIRMATION = 'DELIVERY_CONFIRMATION',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
}
```

---

## 8. Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────────┐
│     orders       │     │ inventory_reservations│
│──────────────────│     │──────────────────────│
│ id (PK)          │◄────│ order_id             │
│ customer_id      │     │ product_id (FK)──────│──┐
│ total_price      │     │ quantity             │  │
│ status (int)     │     │ status               │  │
│ cancel_reason    │     └──────────────────────┘  │
│ created_at       │                                │
│ updated_at       │     ┌──────────────────┐      │
└────────┬─────────┘     │    products      │      │
         │               │──────────────────│      │
         │               │ id (PK) ◄───────│──────┘
         │               │ name            │
         │               │ sku (UNIQUE)    │
         │               │ stock_quantity  │
         │               │ reserved_quantity│
         │               │ unit_price      │
         │               └──────────────────┘
         │
    ┌────┴───────────┐    ┌──────────────────┐
    │   payments     │    │   shipments      │
    │────────────────│    │──────────────────│
    │ id (PK)        │    │ id (PK)          │
    │ order_id (UQ)  │    │ order_id (UQ)    │
    │ amount         │    │ status           │
    │ status         │    │ tracking_number  │
    │ failure_reason │    │ shipped_at       │
    └────────────────┘    └──────────────────┘

    ┌──────────────────┐
    │  notifications   │
    │──────────────────│
    │ id (PK)          │
    │ order_id         │
    │ type             │
    │ recipient        │
    │ subject          │
    │ body             │
    └──────────────────┘

--- Shared Infrastructure (one copy per module schema) ---

    ┌──────────────────────┐    ┌──────────────────────┐
    │   outbox_messages    │    │   inbox_messages     │
    │──────────────────────│    │──────────────────────│
    │ id (PK)              │    │ id (PK)              │
    │ event_type           │    │ message_id           │
    │ payload (JSON)       │    │ handler_name         │
    │ exchange             │    │ event_type           │
    │ routing_key          │    │ created_at           │
    │ correlation_id       │    │ (UQ: message_id +    │
    │ causation_id         │    │  handler_name)       │
    │ processed            │    └──────────────────────┘
    │ processed_at         │
    │ created_at           │
    └──────────────────────┘
```

---

## 9. Data Ownership Rules

| Table | Owner Module | Who Can Read | Who Can Write |
|-------|-------------|-------------|---------------|
| orders | Order | Order only | Order only |
| products | Inventory | Inventory only | Inventory only |
| inventory_reservations | Inventory | Inventory only | Inventory only |
| payments | Payment | Payment only | Payment only |
| shipments | Shipping | Shipping only | Shipping only |
| notifications | Notification | Notification only | Notification only |
| outbox_messages | Shared | All modules (own messages) | All modules (own messages) |
| inbox_messages | Shared | All modules (own records) | All modules (own records) |

**Critical Rule**: No module queries another module's tables directly. All cross-module data access happens through events.

---

## 10. Migration Strategy

Migrations are **run per module** through the `package.json` scripts, each of which passes a MikroORM `--contextName` so it targets that module's schema and migration folder:

```bash
# Run pending migrations for a specific module
npm run migration:up:order
npm run migration:up:inventory
npm run migration:up:payment
npm run migration:up:shipping
npm run migration:up:notification
```

Each module owns its migration files under `modules/<module>/src/infrastructure/database/migrations/`, and every migration issues `CREATE SCHEMA IF NOT EXISTS` for its module schema before creating tables. See [06-migration-strategy.md](06-migration-strategy.md) for the two-context (runtime vs CLI) model.

Migration file naming convention: `<timestamp>-<DescriptiveName>.ts` (e.g. `1710000000001-create-orders.ts`).
