import { Controller, Get, Query } from '@nestjs/common';
import { ListOrdersDto } from './list-orders.dto';
import { ListOrdersQuery } from './list-orders.query';
import { ListOrdersHandler } from './list-orders.handler';

@Controller('api/orders')
export class ListOrdersController {
  constructor(private readonly listOrdersHandler: ListOrdersHandler) {}

  @Get()
  async listOrders(@Query() dto: ListOrdersDto) {
    const query = new ListOrdersQuery(dto.status, dto.limit, dto.offset);
    return await this.listOrdersHandler.handle(query);
  }
}
