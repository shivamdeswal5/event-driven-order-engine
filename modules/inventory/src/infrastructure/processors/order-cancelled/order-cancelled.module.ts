import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OrderCancelledProcessor } from './order-cancelled.processor';
import { Product } from '../../../domain/product/product.entity';
import { InventoryReservation } from '../../../domain/reservation/inventory-reservation.entity';
import { ProductRepository } from '../../repository/product.repository';
import { InventoryReservationRepository } from '../../repository/inventory-reservation.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Product, InventoryReservation])],
  providers: [
    OrderCancelledProcessor,
    ProductRepository,
    InventoryReservationRepository,
  ],
  exports: [OrderCancelledProcessor],
})
export class OrderCancelledProcessorModule {}
