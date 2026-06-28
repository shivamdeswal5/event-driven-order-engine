import { DynamicModule, Module, Type } from '@nestjs/common';
import { RabbitmqModule } from '../config/rabbitmq.module';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { InboxMessage } from '@shared/domain/inbox/inbox-message.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConsumerService } from './consumer.service';
import { InboxMessageHandler } from '../../inbox-message-handler.service';
import { SignatureTypes } from '../signature-types';
import { IRabbitMqConfig } from '../config/rabbitmq-config.interface';
import { HandleMessages } from '../../cli-commands/handle-messages';

@Module({})
export class ConsumerModule {
  static forSignatureTypes(
    signatureTypes: Type<SignatureTypes>,
    config: Type<IRabbitMqConfig>,
  ): DynamicModule {
    return {
      module: ConsumerModule,
      imports: [
        RabbitmqModule.forRoot(config),
        MikroOrmModule.forFeature([InboxMessage]),
      ],
      providers: [
        HandleMessages,
        ConsumerService,
        { provide: SignatureTypes, useClass: signatureTypes },
        InboxMessageHandler,
        InboxMessageRepository,
      ],
      exports: [
        ConsumerService,
        InboxMessageHandler,
      ],
    };
  }
}
