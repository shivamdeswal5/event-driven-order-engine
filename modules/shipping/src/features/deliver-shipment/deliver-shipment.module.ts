import { Module } from '@nestjs/common';
import { DeliverShipmentController } from './deliver-shipment.controller';
import { DeliverShipmentHandler } from './deliver-shipment.handler';
import { GetShipmentModule } from '../get-shipment/get-shipment.module';

@Module({
  imports: [GetShipmentModule],
  controllers: [DeliverShipmentController],
  providers: [DeliverShipmentHandler],
  exports: [DeliverShipmentHandler],
})
export class DeliverShipmentModule {}
