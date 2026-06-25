import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  outboxConfig,
} from './shared/infrastructure/config/app.config';

import mikroOrmConfig from '../mikro-orm.config';

/**
 * Root application module.
 *
 * Registers:
 * - ConfigModule: loads .env and typed config namespaces
 * - MikroOrmModule: database connection with Unit of Work
 *
 * Domain modules (Order, Inventory, Payment, Shipping, Notification)
 * will be added here as they are implemented.
 */
@Module({
  imports: [
    // Global config — available everywhere without re-importing
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
    }),

    // Database — MikroORM with PostgreSQL
    MikroOrmModule.forRoot(mikroOrmConfig),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
