import { Controller, Get, Param } from '@nestjs/common';
import { GetPaymentQuery } from './get-payment.query';
import { GetPaymentHandler } from './get-payment.handler';

@Controller('payments')
export class GetPaymentController {
  constructor(private readonly getPaymentHandler: GetPaymentHandler) {}

  @Get(':orderId')
  async getPayment(@Param('orderId') orderId: string) {
    const query = new GetPaymentQuery(orderId);
    return await this.getPaymentHandler.handle(query);
  }
}
