import { Body, Controller, Param, Post } from '@nestjs/common';
import { CancelOrderDto } from './cancel-order.dto';
import { CancelOrderCommand } from './cancel-order.command';
import { CancelOrderHandler } from './cancel-order.handler';

@Controller('api/orders')
export class CancelOrderController {
  constructor(private readonly cancelOrderHandler: CancelOrderHandler) {}

  @Post(':id/cancel')
  async cancelOrder(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    const command = new CancelOrderCommand(id, dto.reason);
    await this.cancelOrderHandler.handle(command);
    return {
      message: 'Order cancelled successfully.',
    };
  }
}
