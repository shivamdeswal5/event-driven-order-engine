import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqConfigService } from './rabbitmq-config.service';
import { RabbitmqConfigurerService } from './rabbitmq-configurer.service';
import { RabbitmqConnectionService } from './rabbitmq-connection.service';
import { LazyLoadHandler } from '../../lazy-load-handler.service';
import { RabbitmqRuntimeConfig } from './rabbitmq-runtime-config.service';
import { IRabbitMqConfig, RABBITMQ_CONFIG } from './rabbitmq-config.interface';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forFeature([]),
  ],
  providers: [
    RabbitmqConfigService,
    RabbitmqConfigurerService,
    RabbitmqConnectionService,
    RabbitmqRuntimeConfig,
    LazyLoadHandler,
  ],
  exports: [
    RabbitmqConfigService,
    RabbitmqConfigurerService,
    RabbitmqConnectionService,
    RabbitmqRuntimeConfig,
    LazyLoadHandler,
  ],
})
export class RabbitmqModule {
  static forRoot(configClass: Type<IRabbitMqConfig>): DynamicModule {
    return {
      module: RabbitmqModule,
      providers: [
        {
          provide: RABBITMQ_CONFIG,
          useClass: configClass,
        },
      ],
    };
  }
}
