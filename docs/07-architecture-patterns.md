# Architecture Patterns & Folder Structure

This document outlines the standard architectural patterns and folder structures used across the event-driven order engine, based on the `residency-backend` modular monolith approach.

## 1. Domain Structure (Per-Entity)

The `domain` folder should be organized by entity rather than by concept. Instead of having flat `events`, `exceptions`, `enums` folders, we group these by the entity they belong to.

**Correct Pattern:**
```
domain/
  [entity-name]/
    [entity-name].entity.ts
    events/
      [domain-event].event.ts
    exceptions/
      [entity].exceptions.ts
    enum/
      [enum-name].enum.ts
    enum-mapper/
      [enum-name]-mapper.ts
```

**Example (Inventory Module):**
```
domain/
  product/
    product.entity.ts
    events/
      inventory-reserved.event.ts
      inventory-reservation-failed.event.ts
    exceptions/
      product.exceptions.ts
  reservation/
    inventory-reservation.entity.ts
    events/
      inventory-released.event.ts
    exceptions/
      reservation.exceptions.ts
    enum/
      reservation-status.enum.ts
    enum-mapper/
      reservation-status-mapper.ts
```

## 2. Feature Module Exports

Parent feature modules (e.g., `InventoryModule`, `OrderModule`, `ApplicationsForStayModule`) **should not** re-export their child feature modules (e.g., `AddProductModule`, `PlaceOrderModule`).

In NestJS, when a child module registers its own controllers, those controllers are automatically instantiated and bound to the routing tree as long as the parent module imports the child module. There is no need to export the child module unless its providers need to be injected into other modules that import the parent.

**Correct Pattern:**
```typescript
@Module({
  imports: [
    AddProductModule,
    GetProductModule,
    // ...
  ],
  // NO exports array for child feature modules
})
export class InventoryModule {}
```

## 3. Event Processors

Event processors follow a subfolder pattern and are wrapped in their own NestJS modules to support dynamic lazy-loading via the `SignatureTypes` service.

**Correct Pattern:**
```
infrastructure/
  processors/
    [event-name]/
      [event-name].processor.ts
      [event-name].module.ts
    signature.types.service.ts
```

- **Processor:** Implements the actual logic (e.g., `OrderPlacedProcessor`) and uses `@Transactional()`.
- **Module:** A standalone module (e.g., `OrderPlacedProcessorModule`) that provides the processor and imports any required repositories.
- **SignatureTypes:** Registers the processor using the `LazyLoadHandler` inside the `constructor`.

## 4. Database Migrations

Migrations should be granular. Instead of one large migration per module, split them by table/responsibility.

**Example:**
- `1710000000011-create-products.ts`
- `1710000000012-create-inventory-reservations.ts`
- `1710000000013-create-outbox.ts`
- `1710000000014-create-inbox.ts`

Each migration must use the specific module schema (e.g., `process.env.DB_SCHEMA_INVENTORY`) and begin by ensuring the schema exists (`CREATE SCHEMA IF NOT EXISTS`).

## 5. Aggregate Isolation (No Direct ORM Relationships)

In our Domain-Driven Design (DDD) modular monolith architecture, entities within the same domain (or across domains) **should not** declare direct ORM object relationships (such as `@ManyToOne` or `@OneToMany` annotations) to other aggregates. For example, `InventoryReservation` has a `productId` string column rather than a `@ManyToOne(() => Product)` relationship.

### Rationale:
1. **Aggregate Independence**: Each aggregate (e.g., `Product` or `InventoryReservation`) is a self-contained boundary for transactional consistency. Keeping them decoupled prevents developers from modifying multiple aggregates in a single transaction.
2. **Microservice Readiness**: Since there are no hard foreign key constraints or ORM associations between aggregates, any module (or sub-domain) can be extracted into its own physically separate microservice with its own database with zero code refactoring.
3. **Performance**: Referencing entities by ID avoids accidental deep eager loading of large object graphs, making database queries predictable and performant.

---

## 6. Dynamic CLI Module Registry & Shared Imports

When executing background CLI workers (e.g., to run outbox publishers or message consumers), the process boots an isolated NestJS container using `module.map.ts` as the dynamic root module. 

To prevent runtime Dependency Injection (DI) errors (such as Nest being unable to resolve `InboxMessageRepository` or `RabbitmqConnectionService`), the CLI dynamic modules (`DynamicProducerCliModule` and `DynamicConsumerCliModule`) **must explicitly import `SharedModule`**.

### Rationale:
* **Decoupled Main App**: The domain modules (like `OrderModule` and `InventoryModule`) do not globally import `SharedModule` to keep their slices clean.
* **CLI Context requirements**: CLI commands rely on database schemas, RabbitMQ channels, deduplication inbox managers, and transaction relays. Importing `SharedModule` ensures that all global repositories (`InboxMessage`, `OutboxMessage`) and the `RabbitmqConnectionService` are correctly available inside the CLI's NestJS runtime.
