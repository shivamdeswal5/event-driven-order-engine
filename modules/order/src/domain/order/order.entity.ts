import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { OrderStatus } from './enum/order-status.enum';
import { OrderStatusMapper } from './enum-mapper/order-status-mapper';
import { InvalidOrderStateException } from './exceptions/order.exceptions';

@Entity({ tableName: 'orders', schema: process.env.DB_SCHEMA_ORDER })
export class Order extends BaseEntity {
  @Property({ type: 'uuid' })
  customerId!: string;

  @Property({ type: 'decimal' })
  totalPrice!: number;

  @Property({ type: OrderStatusMapper })
  status: OrderStatus = OrderStatus.PENDING;

  @Property({ nullable: true })
  cancelReason?: string;

  place() {
    if (this.status !== OrderStatus.PENDING) {
      throw new InvalidOrderStateException(this.id, this.status, 'place');
    }
    this.status = OrderStatus.PLACED;
  }

  pay() {
    if (this.status !== OrderStatus.PLACED) {
      throw new InvalidOrderStateException(this.id, this.status, 'pay');
    }
    this.status = OrderStatus.PAID;
  }

  cancel(reason: string) {
    if (
      this.status === OrderStatus.SHIPPED ||
      this.status === OrderStatus.DELIVERED
    ) {
      throw new InvalidOrderStateException(this.id, this.status, 'cancel');
    }
    if (this.status === OrderStatus.CANCELLED) {
      return; // Already cancelled, idempotent operation
    }
    this.status = OrderStatus.CANCELLED;
    this.cancelReason = reason;
  }

  ship() {
    if (this.status !== OrderStatus.PAID) {
      throw new InvalidOrderStateException(this.id, this.status, 'ship');
    }
    this.status = OrderStatus.SHIPPED;
  }

  deliver() {
    if (this.status !== OrderStatus.SHIPPED) {
      throw new InvalidOrderStateException(this.id, this.status, 'deliver');
    }
    this.status = OrderStatus.DELIVERED;
  }
}
