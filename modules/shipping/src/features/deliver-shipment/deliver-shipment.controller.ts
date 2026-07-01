import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { DeliverShipmentCommand } from './deliver-shipment.command';
import { DeliverShipmentHandler } from './deliver-shipment.handler';

@Controller('api/shipments')
export class DeliverShipmentController {
  constructor(
    private readonly deliverShipmentHandler: DeliverShipmentHandler,
  ) {}

  @Post(':orderId/deliver')
  @HttpCode(HttpStatus.OK)
  async deliverShipment(@Param('orderId') orderId: string) {
    const command = new DeliverShipmentCommand(orderId);
    await this.deliverShipmentHandler.handle(command);
    return {
      message: 'Shipment marked as DELIVERED successfully.',
    };
  }
}
