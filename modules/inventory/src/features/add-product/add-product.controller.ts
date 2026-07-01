import { Body, Controller, Post } from '@nestjs/common';
import { AddProductDto } from './add-product.dto';
import { AddProductCommand } from './add-product.command';
import { AddProductHandler } from './add-product.handler';

@Controller('api/products')
export class AddProductController {
  constructor(private readonly addProductHandler: AddProductHandler) {}

  @Post()
  async addProduct(@Body() dto: AddProductDto) {
    const command = new AddProductCommand(
      dto.name,
      dto.sku,
      dto.stockQuantity,
      dto.unitPrice,
    );
    const product = await this.addProductHandler.handle(command);
    return {
      message: 'Product added successfully.',
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
