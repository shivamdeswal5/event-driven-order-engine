import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../../domain/product/product.entity';
import { UpdateStockController } from './update-stock.controller';
import { UpdateStockHandler } from './update-stock.handler';
import { ProductRepository } from '../../infrastructure/repository/product.repository';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [UpdateStockController],
  providers: [UpdateStockHandler, ProductRepository],
  exports: [UpdateStockHandler],
})
export class UpdateStockModule {}
