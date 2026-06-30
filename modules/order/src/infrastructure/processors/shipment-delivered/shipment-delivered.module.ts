import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ShipmentDeliveredProcessor } from './shipment-delivered.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [ShipmentDeliveredProcessor, OrderRepository],
  exports: [ShipmentDeliveredProcessor],
})
export class ShipmentDeliveredProcessorModule {}
