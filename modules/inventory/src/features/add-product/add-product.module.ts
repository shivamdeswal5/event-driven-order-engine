import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../../domain/product/product.entity';
import { AddProductController } from './add-product.controller';
import { AddProductHandler } from './add-product.handler';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [AddProductController],
  providers: [AddProductHandler, ProductRepository],
  exports: [AddProductHandler, ProductRepository],
})
export class AddProductModule {}
