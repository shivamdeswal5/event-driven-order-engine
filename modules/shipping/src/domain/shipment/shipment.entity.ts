import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { ShipmentStatus } from './enum/shipment-status.enum';
import { ShipmentStatusMapper } from './enum-mapper/shipment-status-mapper';
import { InvalidShipmentStateException } from './exceptions/shipment.exceptions';

@Entity({ tableName: 'shipments', schema: process.env.DB_SCHEMA_SHIPPING })
export class Shipment extends BaseEntity {
  @Property({ type: 'uuid' })
  @Unique()
  orderId!: string;

  @Property({ type: ShipmentStatusMapper, default: 0 })
  status: ShipmentStatus = ShipmentStatus.PENDING;

  @Property({ type: 'varchar(100)', nullable: true })
  carrier?: string | null;

  @Property({ type: 'varchar(100)', nullable: true })
  trackingNumber?: string | null;

  @Property({ type: 'timestamp', nullable: true })
  shippedAt?: Date | null;

  @Property({ type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;

  ship(carrier: string, trackingNumber: string) {
    if (this.status !== ShipmentStatus.PENDING) {
      throw new InvalidShipmentStateException(this.id, this.status, 'ship');
    }
    this.status = ShipmentStatus.SHIPPED;
    this.carrier = carrier;
    this.trackingNumber = trackingNumber;
    this.shippedAt = new Date();
  }

  deliver() {
    if (this.status !== ShipmentStatus.SHIPPED) {
      throw new InvalidShipmentStateException(this.id, this.status, 'deliver');
    }
    this.status = ShipmentStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  cancel() {
    if (this.status !== ShipmentStatus.PENDING) {
      throw new InvalidShipmentStateException(this.id, this.status, 'cancel');
    }
    this.status = ShipmentStatus.CANCELLED;
  }
}
