import { Controller, Get, Param } from '@nestjs/common';
import { GetProductQuery } from './get-product.query';
import { GetProductHandler } from './get-product.handler';

@Controller('api/products')
export class GetProductController {
  constructor(private readonly getProductHandler: GetProductHandler) {}

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const query = new GetProductQuery(id);
    const product = await this.getProductHandler.handle(query);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      unitPrice: product.unitPrice,
      createdAt: product.createdAt,
    };
  }
}
