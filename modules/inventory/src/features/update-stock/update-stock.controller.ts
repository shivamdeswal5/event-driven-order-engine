import { Body, Controller, Param, Patch } from '@nestjs/common';
import { UpdateStockDto } from './update-stock.dto';
import { UpdateStockCommand } from './update-stock.command';
import { UpdateStockHandler } from './update-stock.handler';

@Controller('products')
export class UpdateStockController {
  constructor(private readonly updateStockHandler: UpdateStockHandler) {}

  @Patch(':id/stock')
  async updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    const command = new UpdateStockCommand(id, dto.adjustment);
    const product = await this.updateStockHandler.handle(command);
    return {
      message: 'Stock updated successfully.',
      data: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        stockQuantity: product.stockQuantity,
        reservedQuantity: product.reservedQuantity,
        unitPrice: product.unitPrice,
        createdAt: product.createdAt,
      },
    };
  }
}
