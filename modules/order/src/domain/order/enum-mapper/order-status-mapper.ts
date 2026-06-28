import { Type } from '@mikro-orm/core';
import { OrderStatus } from '../enum/order-status.enum';

export class OrderStatusMapper extends Type<OrderStatus, number> {
  private readonly mapper = {
    [OrderStatus.PENDING]: 0,
    [OrderStatus.PLACED]: 1,
    [OrderStatus.PAID]: 2,
    [OrderStatus.CANCELLED]: 3,
    [OrderStatus.SHIPPED]: 4,
    [OrderStatus.DELIVERED]: 5,
  };

  convertToDatabaseValue(value: OrderStatus): number {
    return this.mapper[value];
  }

  convertToJSValue(value: number): OrderStatus {
    const member = Object.keys(this.mapper).find(
      (key) => this.mapper[key as OrderStatus] === value,
    );
    if (!member) {
      throw new Error(`Unknown OrderStatus database value: ${value}`);
    }
    return OrderStatus[member as keyof typeof OrderStatus];
  }

  getColumnType() {
    return 'integer';
  }
}
