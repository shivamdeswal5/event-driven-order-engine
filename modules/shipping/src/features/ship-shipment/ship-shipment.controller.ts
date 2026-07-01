import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ShipShipmentDto } from './ship-shipment.dto';
import { ShipShipmentCommand } from './ship-shipment.command';
import { ShipShipmentHandler } from './ship-shipment.handler';

@Controller('api/shipments')
export class ShipShipmentController {
  constructor(private readonly shipShipmentHandler: ShipShipmentHandler) {}

  @Post(':orderId/ship')
  @HttpCode(HttpStatus.OK)
  async shipShipment(
    @Param('orderId') orderId: string,
    @Body() dto: ShipShipmentDto,
  ) {
    const command = new ShipShipmentCommand(
      orderId,
      dto.carrier,
      dto.trackingNumber,
    );
    await this.shipShipmentHandler.handle(command);
    return {
      message: 'Shipment marked as SHIPPED successfully.',
    };
  }
}
