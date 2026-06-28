import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Order } from '../../domain/order/order.entity';
import { CancelOrderController } from './cancel-order.controller';
import { CancelOrderHandler } from './cancel-order.handler';
import { OrderRepository } from '../../infrastructure/repository/order.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  controllers: [CancelOrderController],
  providers: [CancelOrderHandler, OrderRepository],
  exports: [CancelOrderHandler],
})
export class CancelOrderModule {}
