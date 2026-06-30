import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PaymentCompletedProcessor } from './payment-completed.processor';
import { Shipment } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../repository/shipment.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Shipment])],
  providers: [PaymentCompletedProcessor, ShipmentRepository],
  exports: [PaymentCompletedProcessor],
})
export class PaymentCompletedProcessorModule {}
