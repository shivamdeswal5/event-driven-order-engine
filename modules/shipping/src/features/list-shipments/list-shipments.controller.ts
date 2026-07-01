import { Controller, Get, Query } from '@nestjs/common';
import { ListShipmentsDto } from './list-shipments.dto';
import { ListShipmentsQuery } from './list-shipments.query';
import { ListShipmentsHandler } from './list-shipments.handler';

@Controller('api/shipments')
export class ListShipmentsController {
  constructor(private readonly listShipmentsHandler: ListShipmentsHandler) {}

  @Get()
  async listShipments(@Query() dto: ListShipmentsDto) {
    const query = new ListShipmentsQuery(dto.status, dto.limit, dto.offset);
    return await this.listShipmentsHandler.handle(query);
  }
}
