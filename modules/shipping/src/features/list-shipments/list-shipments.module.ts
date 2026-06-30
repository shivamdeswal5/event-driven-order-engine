import { Module } from '@nestjs/common';
import { ListShipmentsController } from './list-shipments.controller';
import { ListShipmentsHandler } from './list-shipments.handler';

@Module({
  controllers: [ListShipmentsController],
  providers: [ListShipmentsHandler],
  exports: [ListShipmentsHandler],
})
export class ListShipmentsModule {}
