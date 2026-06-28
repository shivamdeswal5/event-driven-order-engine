import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Order } from '../../domain/order/order.entity';
import { PlaceOrderController } from './place-order.controller';
import { PlaceOrderHandler } from './place-order.handler';
import { OrderRepository } from '../../infrastructure/repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  controllers: [PlaceOrderController],
  providers: [PlaceOrderHandler, OrderRepository],
  exports: [PlaceOrderHandler],
})
export class PlaceOrderModule {}
