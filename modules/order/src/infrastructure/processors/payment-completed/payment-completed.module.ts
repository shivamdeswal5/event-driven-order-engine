import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PaymentCompletedProcessor } from './payment-completed.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [PaymentCompletedProcessor, OrderRepository],
  exports: [PaymentCompletedProcessor],
})
export class PaymentCompletedProcessorModule {}
