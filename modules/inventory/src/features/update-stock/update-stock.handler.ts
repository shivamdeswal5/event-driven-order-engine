import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { UpdateStockCommand } from './update-stock.command';
import { Product } from '../../domain/product/product.entity';
import {
  ProductNotFoundException,
  InsufficientStockException,
} from '../../domain/product/exceptions/product.exceptions';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Injectable()
export class UpdateStockHandler {
  constructor(private readonly productRepository: ProductRepository) {}

  @Transactional()
  async handle(command: UpdateStockCommand): Promise<Product> {
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      throw new ProductNotFoundException(command.productId);
    }

    const newStock = product.stockQuantity + command.adjustment;
    if (newStock < 0) {
      throw new InsufficientStockException(
        product.id,
        Math.abs(command.adjustment),
        product.stockQuantity,
      );
    }

    product.stockQuantity = newStock;
    await this.productRepository.save(product);
    return product;
  }
}
