import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { Product } from '../../domain/product/product.entity';
import { AddProductCommand } from './add-product.command';
import { SkuAlreadyExistsException } from '../../domain/product/exceptions/product.exceptions';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Injectable()
export class AddProductHandler {
  constructor(private readonly productRepository: ProductRepository) {}

  @Transactional()
  async handle(command: AddProductCommand): Promise<Product> {
    const existing = await this.productRepository.findBySku(command.sku);
    if (existing) {
      throw new SkuAlreadyExistsException(command.sku);
    }

    const product = new Product();
    product.name = command.name;
    product.sku = command.sku;
    product.stockQuantity = command.stockQuantity;
    product.unitPrice = command.unitPrice;

    await this.productRepository.save(product);
    return product;
  }
}
