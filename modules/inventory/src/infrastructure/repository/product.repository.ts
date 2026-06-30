import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Product } from '../../domain/product/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: EntityRepository<Product>,
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Product | null> {
    return await this.repository.findOne({ id });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return await this.repository.findOne({ sku });
  }

  async findAll(): Promise<Product[]> {
    return await this.repository.findAll();
  }

  async save(product: Product): Promise<void> {
    await this.em.persistAndFlush(product);
  }

  async remove(product: Product): Promise<void> {
    await this.em.removeAndFlush(product);
  }
}
