import { Module } from '@nestjs/common';
import { GetPaymentModule } from './get-payment/get-payment.module';
import { ListPaymentsModule } from './list-payments/list-payments.module';
import { PaymentMessageDestinationModule } from '../infrastructure/message-bus/payment.message-destination.module';

@Module({
  imports: [
    GetPaymentModule,
    ListPaymentsModule,
    PaymentMessageDestinationModule,
  ],
})
export class PaymentModule {}
