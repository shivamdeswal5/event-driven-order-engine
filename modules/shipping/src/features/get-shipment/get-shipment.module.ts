import { Module } from '@nestjs/common';
import { GetShipmentController } from './get-shipment.controller';
import { GetShipmentHandler } from './get-shipment.handler';
import { ShipmentRepository } from '../../infrastructure/repository/shipment.repository';
import { Shipment } from '../../domain/shipment/shipment.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
  imports: [MikroOrmModule.forFeature([Shipment])],
  controllers: [GetShipmentController],
  providers: [GetShipmentHandler, ShipmentRepository],
  exports: [GetShipmentHandler, ShipmentRepository],
})
export class GetShipmentModule {}
