import { Type } from '@mikro-orm/core';
import { ShipmentStatus } from '../enum/shipment-status.enum';

export class ShipmentStatusMapper extends Type<ShipmentStatus, number> {
  private readonly mapper: Record<ShipmentStatus, number> = {
    [ShipmentStatus.PENDING]: 0,
    [ShipmentStatus.SHIPPED]: 1,
    [ShipmentStatus.DELIVERED]: 2,
    [ShipmentStatus.CANCELLED]: 3,
  };

  override convertToDatabaseValue(value: ShipmentStatus): number {
    return this.mapper[value];
  }

  override convertToJSValue(value: number): ShipmentStatus {
    const member = Object.keys(this.mapper).find(
      (key) => this.mapper[key as ShipmentStatus] === value,
    ) as ShipmentStatus | undefined;

    if (!member) {
      throw new Error(`Unknown ShipmentStatus database value: ${value}`);
    }

    return member;
  }

  override getColumnType(): string {
    return 'integer';
  }
}
