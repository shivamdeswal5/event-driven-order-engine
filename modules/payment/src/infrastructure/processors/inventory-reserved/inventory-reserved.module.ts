import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InventoryReservedProcessor } from './inventory-reserved.processor';
import { Payment } from '../../../domain/payment/payment.entity';
import { PaymentRepository } from '../../repository/payment.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Payment])],
  providers: [InventoryReservedProcessor, PaymentRepository],
  exports: [InventoryReservedProcessor],
})
export class InventoryReservedProcessorModule {}
