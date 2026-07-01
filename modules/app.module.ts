import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SharedModule } from '@shared/shared.module';
import { OrderModule } from '@order/features/order.module';
import { InventoryModule } from '@inventory/features/inventory.module';
import { PaymentModule } from '@payment/features/payment.module';
import { ShippingModule } from '@shipping/features/shipping.module';
import { NotificationModule } from '@notification/features/notification.module';

import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  outboxConfig,
} from '@shared/infrastructure/config/app.config';

import mikroOrmConfig from '../mikro-orm.config';

import { AppController } from './app.controller';
import { AppHandler } from './app.handler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    SharedModule,
    OrderModule,
    InventoryModule,
    PaymentModule,
    ShippingModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppHandler],
})
export class AppModule {}
