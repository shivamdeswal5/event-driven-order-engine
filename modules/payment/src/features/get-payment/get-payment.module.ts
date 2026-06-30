import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Payment } from '../../domain/payment/payment.entity';
import { GetPaymentController } from './get-payment.controller';
import { GetPaymentHandler } from './get-payment.handler';
import { PaymentRepository } from '../../infrastructure/repository/payment.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Payment])],
  controllers: [GetPaymentController],
  providers: [GetPaymentHandler, PaymentRepository],
  exports: [GetPaymentHandler],
})
export class GetPaymentModule {}
