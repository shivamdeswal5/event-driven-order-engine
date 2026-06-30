import { Controller, Get, Query } from '@nestjs/common';
import { ListPaymentsDto } from './list-payments.dto';
import { ListPaymentsQuery } from './list-payments.query';
import { ListPaymentsHandler } from './list-payments.handler';

@Controller('payments')
export class ListPaymentsController {
  constructor(private readonly listPaymentsHandler: ListPaymentsHandler) {}

  @Get()
  async listPayments(@Query() dto: ListPaymentsDto) {
    const query = new ListPaymentsQuery(dto.status, dto.limit, dto.offset);
    return await this.listPaymentsHandler.handle(query);
  }
}
