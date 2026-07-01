import { Controller, Get, Query } from '@nestjs/common';
import { ListProductsQuery } from './list-products.query';
import { ListProductsHandler } from './list-products.handler';

@Controller('api/products')
export class ListProductsController {
  constructor(private readonly listProductsHandler: ListProductsHandler) {}

  @Get()
  async listProducts(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const query = new ListProductsQuery(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
    const products = await this.listProductsHandler.handle(query);
    return {
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stockQuantity: product.stockQuantity,
        reservedQuantity: product.reservedQuantity,
        unitPrice: product.unitPrice,
        createdAt: product.createdAt,
      })),
    };
  }
}
