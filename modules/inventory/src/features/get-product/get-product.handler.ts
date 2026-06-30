import { Injectable } from '@nestjs/common';
import { GetProductQuery } from './get-product.query';
import { Product } from '../../domain/product/product.entity';
import { ProductNotFoundException } from '../../domain/product/exceptions/product.exceptions';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Injectable()
export class GetProductHandler {
  constructor(private readonly productRepository: ProductRepository) {}

  async handle(query: GetProductQuery): Promise<Product> {
    const product = await this.productRepository.findById(query.productId);
    if (!product) {
      throw new ProductNotFoundException(query.productId);
    }
    return product;
  }
}
