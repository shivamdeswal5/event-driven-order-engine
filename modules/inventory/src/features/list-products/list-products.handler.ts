import { Injectable } from '@nestjs/common';
import { ListProductsQuery } from './list-products.query';
import { Product } from '../../domain/product/product.entity';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Injectable()
export class ListProductsHandler {
  constructor(private readonly productRepository: ProductRepository) {}

  async handle(query: ListProductsQuery): Promise<Product[]> {
    return await this.productRepository.findAll();
  }
}
