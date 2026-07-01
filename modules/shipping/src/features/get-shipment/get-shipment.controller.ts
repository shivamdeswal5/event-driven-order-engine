import { Controller, Get, Param } from '@nestjs/common';
import { GetShipmentQuery } from './get-shipment.query';
import { GetShipmentHandler } from './get-shipment.handler';

@Controller('api/shipments')
export class GetShipmentController {
  constructor(private readonly getShipmentHandler: GetShipmentHandler) {}

  @Get(':orderId')
  async getShipment(@Param('orderId') orderId: string) {
    const query = new GetShipmentQuery(orderId);
    return await this.getShipmentHandler.handle(query);
  }
}
