import { Module } from '@nestjs/common';
import { ListOrdersController } from './list-orders.controller';
import { ListOrdersHandler } from './list-orders.handler';

@Module({
  controllers: [ListOrdersController],
  providers: [ListOrdersHandler],
  exports: [ListOrdersHandler],
})
export class ListOrdersModule {}
