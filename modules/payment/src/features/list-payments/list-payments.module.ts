import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Payment } from '../../domain/payment/payment.entity';
import { ListPaymentsController } from './list-payments.controller';
import { ListPaymentsHandler } from './list-payments.handler';

@Module({
  imports: [MikroOrmModule.forFeature([Payment])],
  controllers: [ListPaymentsController],
  providers: [ListPaymentsHandler],
  exports: [ListPaymentsHandler],
})
export class ListPaymentsModule {}
