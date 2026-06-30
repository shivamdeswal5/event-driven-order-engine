import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProducerModule } from '../rabbitmq/producer/producer.module';
import { ConsumerModule } from '../rabbitmq/consumer/consumer.module';
import { OrderMessageDestinationModule } from '@order/infrastructure/message-bus/order.message-destination.module';
import { OrderSignatureTypes } from '@order/infrastructure/processors/signature.types.service';
import { InventoryMessageDestinationModule } from '@inventory/infrastructure/message-bus/inventory.message-destination.module';
import { InventorySignatureTypes } from '@inventory/infrastructure/processors/signature.types.service';
import { PaymentMessageDestinationModule } from '@payment/infrastructure/message-bus/payment.message-destination.module';
import { PaymentSignatureTypes } from '@payment/infrastructure/processors/signature.types.service';
import { ShippingMessageDestinationModule } from '@shipping/infrastructure/message-bus/shipping.message-destination.module';
import { ShippingSignatureTypes } from '@shipping/infrastructure/processors/signature.types.service';
import { NotificationMessageDestinationModule } from '@notification/infrastructure/message-bus/notification.message-destination.module';
import { NotificationSignatureTypes } from '@notification/infrastructure/processors/signature.types.service';
import { createDynamicRabbitMqConfig } from '../rabbitmq/config/dynamic-rabbitmq.config';
import { SharedModule } from '../../../shared.module';
import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  outboxConfig,
} from '@shared/infrastructure/config/app.config';
import mikroOrmConfig from '../../../../../../mikro-orm.config';

function createProducerCliModule(
  moduleName: string,
  destinationModule: any,
): any {
  const configClass = createDynamicRabbitMqConfig(moduleName);

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
      }),
      MikroOrmModule.forRoot(mikroOrmConfig),
      SharedModule,
      ProducerModule.forRoot(configClass),
      OrderMessageDestinationModule,
      InventoryMessageDestinationModule,
      PaymentMessageDestinationModule,
      ShippingMessageDestinationModule,
      NotificationMessageDestinationModule,
    ],
  })
  class DynamicProducerCliModule {}

  return DynamicProducerCliModule;
}

function createConsumerCliModule(
  moduleName: string,
  signatureTypes: any,
  destinationModule: any,
): any {
  const configClass = createDynamicRabbitMqConfig(moduleName);

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
      }),
      MikroOrmModule.forRoot(mikroOrmConfig),
      SharedModule,
      ConsumerModule.forSignatureTypes(signatureTypes, configClass),
      OrderMessageDestinationModule,
      InventoryMessageDestinationModule,
      PaymentMessageDestinationModule,
      ShippingMessageDestinationModule,
      NotificationMessageDestinationModule,
    ],
  })
  class DynamicConsumerCliModule {}

  return DynamicConsumerCliModule;
}

export const CONSUMER_MODULE_MAP: Record<string, any> = {
  order: createConsumerCliModule(
    'order',
    OrderSignatureTypes,
    OrderMessageDestinationModule,
  ),
  inventory: createConsumerCliModule(
    'inventory',
    InventorySignatureTypes,
    InventoryMessageDestinationModule,
  ),
  payment: createConsumerCliModule(
    'payment',
    PaymentSignatureTypes,
    PaymentMessageDestinationModule,
  ),
  shipping: createConsumerCliModule(
    'shipping',
    ShippingSignatureTypes,
    ShippingMessageDestinationModule,
  ),
  notification: createConsumerCliModule(
    'notification',
    NotificationSignatureTypes,
    NotificationMessageDestinationModule,
  ),
};

export const PRODUCER_MODULE_MAP: Record<string, any> = {
  order: createProducerCliModule('order', OrderMessageDestinationModule),
  inventory: createProducerCliModule(
    'inventory',
    InventoryMessageDestinationModule,
  ),
  payment: createProducerCliModule('payment', PaymentMessageDestinationModule),
  shipping: createProducerCliModule(
    'shipping',
    ShippingMessageDestinationModule,
  ),
  notification: createProducerCliModule(
    'notification',
    NotificationMessageDestinationModule,
  ),
};

import { SeedDbCommand } from './seed-db';

export function createSeederCliModule(): any {
  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        load: [appConfig, databaseConfig, rabbitmqConfig, outboxConfig],
      }),
      MikroOrmModule.forRoot(mikroOrmConfig),
      SharedModule,
    ],
    providers: [SeedDbCommand],
  })
  class DynamicSeederCliModule {}

  return DynamicSeederCliModule;
}
