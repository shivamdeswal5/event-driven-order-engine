import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InventoryReservationFailedProcessor } from './inventory-reservation-failed.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [InventoryReservationFailedProcessor, OrderRepository],
  exports: [InventoryReservationFailedProcessor],
})
export class InventoryReservationFailedProcessorModule {}
