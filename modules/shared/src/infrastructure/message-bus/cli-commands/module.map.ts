import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProducerModule } from '../rabbitmq/producer/producer.module';
import { ConsumerModule } from '../rabbitmq/consumer/consumer.module';
import { OrderMessageDestinationModule } from '@order/infrastructure/message-bus/order.message-destination.module';
import { OrderSignatureTypes } from '@order/infrastructure/processors/signature.types.service';
import { createDynamicRabbitMqConfig } from '../rabbitmq/config/dynamic-rabbitmq.config';
import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  outboxConfig,
} from '@shared/infrastructure/config/app.config';
import mikroOrmConfig from '../../../../../../mikro-orm.config';

function createProducerCliModule(moduleName: string, destinationModule: any): any {
  const configClass = createDynamicRabbitMqConfig(moduleName);

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
      }),
      MikroOrmModule.forRoot(mikroOrmConfig),
      ProducerModule.forRoot(configClass),
      destinationModule,
    ],
  })
  class DynamicProducerCliModule {}

  return DynamicProducerCliModule;
}

function createConsumerCliModule(moduleName: string, signatureTypes: any, destinationModule: any): any {
  const configClass = createDynamicRabbitMqConfig(moduleName);

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
      }),
      MikroOrmModule.forRoot(mikroOrmConfig),
      ConsumerModule.forSignatureTypes(signatureTypes, configClass),
      destinationModule,
    ],
  })
  class DynamicConsumerCliModule {}

  return DynamicConsumerCliModule;
}

export const CONSUMER_MODULE_MAP: Record<string, any> = {
  order: createConsumerCliModule('order', OrderSignatureTypes, OrderMessageDestinationModule),
};

export const PRODUCER_MODULE_MAP: Record<string, any> = {
  order: createProducerCliModule('order', OrderMessageDestinationModule),
};
