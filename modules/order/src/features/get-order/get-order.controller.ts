import { Controller, Get, Param } from '@nestjs/common';
import { GetOrderQuery } from './get-order.query';
import { GetOrderHandler } from './get-order.handler';

@Controller('orders')
export class GetOrderController {
  constructor(private readonly getOrderHandler: GetOrderHandler) {}

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const query = new GetOrderQuery(id);
    return await this.getOrderHandler.handle(query);
  }
}
