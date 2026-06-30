import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@shared/domain/base.entity';
import { InsufficientStockException } from './exceptions/product.exceptions';

@Entity({ tableName: 'products', schema: process.env.DB_SCHEMA_INVENTORY })
export class Product extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  @Unique()
  sku!: string;

  @Property({ default: 0 })
  stockQuantity!: number;

  @Property({ default: 0 })
  reservedQuantity: number = 0;

  @Property({ type: 'decimal' })
  unitPrice!: number;

  reserveStock(quantity: number): void {
    if (this.stockQuantity < quantity) {
      throw new InsufficientStockException(
        this.id,
        quantity,
        this.stockQuantity,
      );
    }
    this.stockQuantity -= quantity;
    this.reservedQuantity += quantity;
  }

  releaseStock(quantity: number): void {
    const releaseQty = Math.min(this.reservedQuantity, quantity);
    this.stockQuantity += releaseQty;
    this.reservedQuantity -= releaseQty;
  }

  deductReservedStock(quantity: number): void {
    const deductQty = Math.min(this.reservedQuantity, quantity);
    this.reservedQuantity -= deductQty;
  }
}
