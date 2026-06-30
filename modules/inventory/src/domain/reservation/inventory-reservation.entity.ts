import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { ReservationStatus } from './enum/reservation-status.enum';
import { ReservationStatusMapper } from './enum-mapper/reservation-status-mapper';
import { InvalidReservationStateException } from './exceptions/reservation.exceptions';

@Entity({
  tableName: 'inventory_reservations',
  schema: process.env.DB_SCHEMA_INVENTORY,
})
export class InventoryReservation extends BaseEntity {
  @Property({ type: 'uuid' })
  orderId!: string;

  @Property({ type: 'uuid' })
  productId!: string;

  @Property()
  quantity!: number;

  @Property({ type: ReservationStatusMapper, default: 0 })
  status: ReservationStatus = ReservationStatus.RESERVED;

  release(): void {
    if (this.status !== ReservationStatus.RESERVED) {
      throw new InvalidReservationStateException(
        this.id,
        this.status,
        'release',
      );
    }
    this.status = ReservationStatus.RELEASED;
  }

  deduct(): void {
    if (this.status !== ReservationStatus.RESERVED) {
      throw new InvalidReservationStateException(
        this.id,
        this.status,
        'deduct',
      );
    }
    this.status = ReservationStatus.DEDUCTED;
  }
}
