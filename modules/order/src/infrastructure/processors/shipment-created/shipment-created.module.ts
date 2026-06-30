import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ShipmentCreatedProcessor } from './shipment-created.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [ShipmentCreatedProcessor, OrderRepository],
  exports: [ShipmentCreatedProcessor],
})
export class ShipmentCreatedProcessorModule {}
