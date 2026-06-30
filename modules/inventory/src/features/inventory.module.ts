import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../domain/product/product.entity';
import { InventoryReservation } from '../domain/reservation/inventory-reservation.entity';
import { AddProductModule } from './add-product/add-product.module';
import { GetProductModule } from './get-product/get-product.module';
import { ListProductsModule } from './list-products/list-products.module';
import { UpdateStockModule } from './update-stock/update-stock.module';
import { InventoryMessageDestinationModule } from '../infrastructure/message-bus/inventory.message-destination.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Product, InventoryReservation]),
    AddProductModule,
    GetProductModule,
    ListProductsModule,
    UpdateStockModule,
    InventoryMessageDestinationModule,
  ],
})
export class InventoryModule {}
