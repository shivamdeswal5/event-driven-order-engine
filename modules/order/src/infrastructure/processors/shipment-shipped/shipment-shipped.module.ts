import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ShipmentShippedProcessor } from './shipment-shipped.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [ShipmentShippedProcessor, OrderRepository],
  exports: [ShipmentShippedProcessor],
})
export class ShipmentShippedProcessorModule {}
