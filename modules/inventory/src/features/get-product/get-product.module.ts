import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../../domain/product/product.entity';
import { GetProductController } from './get-product.controller';
import { GetProductHandler } from './get-product.handler';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [GetProductController],
  providers: [GetProductHandler, ProductRepository],
  exports: [GetProductHandler],
})
export class GetProductModule {}
