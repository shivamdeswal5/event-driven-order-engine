import { DynamicModule, Module, Type } from '@nestjs/common';
import { RabbitmqModule } from '../config/rabbitmq.module';
import { OutboxMessageRepository } from 'src/shared/infrastructure/repository/outbox/outbox-message.repository';
import { OutboxMessage } from 'src/shared/infrastructure/outbox/outbox-message.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IRabbitMqConfig } from '../config/rabbitmq-config.interface';
import { ProducerService } from './producer.service';
import { OutboxMessageRelay } from '../../outbox-message-relay.service';
import { DispatchMessages } from '../../cli-commands/dispatch-messages';

@Module({})
export class ProducerModule {
  static forRoot(config: Type<IRabbitMqConfig>): DynamicModule {
    return {
      module: ProducerModule,
      imports: [
        RabbitmqModule.forRoot(config),
        MikroOrmModule.forFeature([OutboxMessage]),
      ],
      providers: [
        DispatchMessages,
        ProducerService,
        OutboxMessageRepository,
        OutboxMessageRelay,
      ],
      exports: [
        ProducerService,
        OutboxMessageRelay,
      ],
    };
  }
}
