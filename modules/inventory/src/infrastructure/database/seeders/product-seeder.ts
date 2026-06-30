import { EntityManager } from '@mikro-orm/core';
import { Product } from '@inventory/domain/product/product.entity';
import { TrackedSeeder } from './tracked-seeder';
import { faker } from '@faker-js/faker';

export class ProductSeeder extends TrackedSeeder {
  async seed(entityManager: EntityManager): Promise<void> {
    const products: Product[] = [];

    for (let i = 0; i < 10; i++) {
      const product = new Product();
      product.name = faker.commerce.productName();
      product.sku = `${faker.commerce.productAdjective().toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`;
      product.stockQuantity = faker.number.int({ min: 20, max: 150 });
      product.unitPrice = parseFloat(
        faker.commerce.price({ min: 10, max: 300 }),
      );

      products.push(product);
    }

    if (products.length) {
      await entityManager.persistAndFlush(products);
      console.log(`Seeded ${products.length} products using faker.`);
    }
  }
}
