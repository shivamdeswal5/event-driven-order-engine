import { Module } from '@nestjs/common';
import { GetShipmentModule } from './get-shipment/get-shipment.module';
import { ListShipmentsModule } from './list-shipments/list-shipments.module';
import { ShipShipmentModule } from './ship-shipment/ship-shipment.module';
import { DeliverShipmentModule } from './deliver-shipment/deliver-shipment.module';
import { ShippingMessageDestinationModule } from '../infrastructure/message-bus/shipping.message-destination.module';

@Module({
  imports: [
    GetShipmentModule,
    ListShipmentsModule,
    ShipShipmentModule,
    DeliverShipmentModule,
    ShippingMessageDestinationModule,
  ],
})
export class ShippingModule {}
