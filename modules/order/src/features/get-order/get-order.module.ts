import { Module } from '@nestjs/common';
import { GetOrderController } from './get-order.controller';
import { GetOrderHandler } from './get-order.handler';

@Module({
  controllers: [GetOrderController],
  providers: [GetOrderHandler],
  exports: [GetOrderHandler],
})
export class GetOrderModule {}
