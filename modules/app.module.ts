import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SharedModule } from '@shared/shared.module';
import { OrderModule } from '@order/features/order.module';

import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  outboxConfig,
} from '@shared/infrastructure/config/app.config';

import mikroOrmConfig from '../mikro-orm.config';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
