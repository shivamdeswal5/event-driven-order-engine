import { Body, Controller, Post } from '@nestjs/common';
import { PlaceOrderDto } from './place-order.dto';
import { PlaceOrderCommand, PlaceOrderCommandItem } from './place-order.command';
import { PlaceOrderHandler } from './place-order.handler';

@Controller('orders')
export class PlaceOrderController {
  constructor(private readonly placeOrderHandler: PlaceOrderHandler) {}

  @Post()
  async placeOrder(@Body() dto: PlaceOrderDto) {
    const commandItems = dto.items.map(
      (item) => new PlaceOrderCommandItem(item.productId, item.quantity, item.price),
    );
    const command = new PlaceOrderCommand(dto.customerId, commandItems);

    await this.placeOrderHandler.handle(command);
    return {
      message: 'Order placed successfully.',
    };
  }
}
