import { Module } from '@nestjs/common';
import { PlaceOrderModule } from './place-order/place-order.module';
import { GetOrderModule } from './get-order/get-order.module';
import { ListOrdersModule } from './list-orders/list-orders.module';
import { CancelOrderModule } from './cancel-order/cancel-order.module';
import { OrderMessageDestinationModule } from '../infrastructure/message-bus/order.message-destination.module';

@Module({
  imports: [
    PlaceOrderModule,
    GetOrderModule,
    ListOrdersModule,
    CancelOrderModule,
    OrderMessageDestinationModule,
  ],
})
export class OrderModule {}
