import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OrderCancelledProcessor } from './order-cancelled.processor';
import { Payment } from '../../../domain/payment/payment.entity';
import { PaymentRepository } from '../../repository/payment.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Payment])],
  providers: [OrderCancelledProcessor, PaymentRepository],
  exports: [OrderCancelledProcessor],
})
export class OrderCancelledProcessorModule {}
