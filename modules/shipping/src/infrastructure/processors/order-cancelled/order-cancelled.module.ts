import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OrderCancelledProcessor } from './order-cancelled.processor';
import { Shipment } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../repository/shipment.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Shipment])],
  providers: [OrderCancelledProcessor, ShipmentRepository],
  exports: [OrderCancelledProcessor],
})
export class OrderCancelledProcessorModule {}
