# Backend Schema Document

## Resilient Event-Driven Order Fulfillment Engine

**Version**: 1.0 | **Last Updated**: 2026-06-25

---

## 1. Database Overview

- **Engine**: PostgreSQL 16
- **ORM**: MikroORM 6.x
- **Single database**, module-prefixed tables
- **UUID primary keys** via `gen_random_uuid()`
- **JSONB** for flexible payloads (order items, event data)

---

## 2. Shared Infrastructure Tables

### 2.1 outbox_messages

Stores events that need to be published to RabbitMQ. Written in the same transaction as business data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique message ID |
| event_type | VARCHAR(255) | NOT NULL | Event name: `OrderPlaced` |
| routing_key | VARCHAR(255) | NOT NULL | RabbitMQ routing key: `order.events.order-placed` |
| exchange | VARCHAR(255) | NOT NULL | Target exchange: `order-exchange` |
| payload | JSONB | NOT NULL | Full MessageEnvelope (serialized) |
| correlation_id | UUID | NOT NULL | Saga correlation ID |
| causation_id | UUID | NULL | ID of the event that caused this |
| published_at | TIMESTAMP | NULL | NULL = not yet published |
| retry_count | INT | DEFAULT 0 | Publishing retry attempts |
| created_at | TIMESTAMP | DEFAULT NOW() | When the message was created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_outbox_unpublished` — `(published_at) WHERE published_at IS NULL` (partial index for relay polling)
- `idx_outbox_created_at` — `(created_at)` (ordering for FIFO processing)

---

### 2.2 inbox_messages

Records processed messages to achieve idempotent consumption (exactly-once semantics).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Row ID |
| message_id | UUID | NOT NULL | Original message ID from producer |
| handler_name | VARCHAR(255) | NOT NULL | Which processor handled it |
| event_type | VARCHAR(255) | NOT NULL | Event type processed |
| created_at | TIMESTAMP | DEFAULT NOW() | When it was processed |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `uq_inbox_message_handler` — UNIQUE `(message_id, handler_name)` (composite key for dedup)

**Note:** `message_id + handler_name` is the dedup key because the same event can be processed by multiple handlers within one module.

---

## 3. Order Module Tables

### 3.1 orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Order ID |
| customer_email | VARCHAR(255) | NOT NULL | Customer email address |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'PLACED' | Current order status (enum) |
| items | JSONB | NOT NULL | Array of order items |
| total_amount | DECIMAL(12,2) | NOT NULL | Calculated total |
| shipping_address | JSONB | NOT NULL | Shipping address object |
| correlation_id | UUID | NOT NULL | Saga correlation ID |
| cancelled_reason | VARCHAR(500) | NULL | Reason for cancellation |
| created_at | TIMESTAMP | DEFAULT NOW() | Order creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_orders_status` — `(status)` (filter by status)
- `idx_orders_customer` — `(customer_email)` (lookup by customer)
- `idx_orders_created` — `(created_at DESC)` (recent orders first)
- `idx_orders_correlation` — `(correlation_id)` (saga tracing)

**Order Status Enum:**
```typescript
enum OrderStatus {
  PLACED = 'PLACED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLING = 'CANCELLING',
  CANCELLED = 'CANCELLED',
}
```

**Valid State Transitions:**
```
PLACED → INVENTORY_RESERVED, CANCELLED
INVENTORY_RESERVED → PAYMENT_PROCESSING, CANCELLED
PAYMENT_PROCESSING → PAID, PAYMENT_FAILED
PAID → SHIPPING
SHIPPING → DELIVERED
PAYMENT_FAILED → CANCELLING
CANCELLING → CANCELLED
```

**Items JSONB Structure:**
```json
[
  {
    "productId": "uuid",
    "productName": "Wireless Mouse",
    "quantity": 2,
    "unitPrice": 29.99,
    "subtotal": 59.98
  }
]
```

**Shipping Address JSONB Structure:**
```json
{
  "street": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "73301",
  "country": "US"
}
```

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
│ customer_email   │     │ product_id (FK)──────│──┐
│ status           │     │ quantity             │  │
│ items (JSONB)    │     │ status               │  │
│ total_amount     │     └──────────────────────┘  │
│ shipping_address │                                │
│ correlation_id   │     ┌──────────────────┐      │
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

--- Shared Infrastructure ---

    ┌──────────────────────┐    ┌──────────────────────┐
    │   outbox_messages    │    │   inbox_messages     │
    │──────────────────────│    │──────────────────────│
    │ id (PK)              │    │ id (PK)              │
    │ event_type           │    │ message_id           │
    │ routing_key          │    │ handler_name         │
    │ exchange             │    │ event_type           │
    │ payload (JSONB)      │    │ processed_at         │
    │ correlation_id       │    │ (UQ: message_id +    │
    │ causation_id         │    │  handler_name)       │
    │ published_at         │    └──────────────────────┘
    │ retry_count          │
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

```bash
# Create a new migration
npx mikro-orm migration:create --name AddOrdersTable

# Run pending migrations
npx mikro-orm migration:up

# Rollback last migration
npx mikro-orm migration:down

# Check migration status
npx mikro-orm migration:pending
```

Migration naming convention: `Migration_YYYYMMDD_HHMMSS_DescriptiveName.ts`
