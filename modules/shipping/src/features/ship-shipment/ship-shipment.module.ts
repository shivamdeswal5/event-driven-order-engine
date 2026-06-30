import { Module } from '@nestjs/common';
import { ShipShipmentController } from './ship-shipment.controller';
import { ShipShipmentHandler } from './ship-shipment.handler';
import { GetShipmentModule } from '../get-shipment/get-shipment.module';

@Module({
  imports: [GetShipmentModule],
  controllers: [ShipShipmentController],
  providers: [ShipShipmentHandler],
  exports: [ShipShipmentHandler],
})
export class ShipShipmentModule {}
