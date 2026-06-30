import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PaymentFailedProcessor } from './payment-failed.processor';
import { Order } from '../../../domain/order/order.entity';
import { OrderRepository } from '../../repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  providers: [PaymentFailedProcessor, OrderRepository],
  exports: [PaymentFailedProcessor],
})
export class PaymentFailedProcessorModule {}
