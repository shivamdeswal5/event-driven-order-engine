import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../../domain/product/product.entity';
import { ListProductsController } from './list-products.controller';
import { ListProductsHandler } from './list-products.handler';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [ListProductsController],
  providers: [ListProductsHandler, ProductRepository],
  exports: [ListProductsHandler],
})
export class ListProductsModule {}
