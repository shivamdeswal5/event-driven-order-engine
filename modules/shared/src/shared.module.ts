import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InboxMessage } from './domain/inbox/inbox-message.entity';
import { OutboxMessage } from './domain/outbox/outbox-message.entity';
import { InboxMessageRepository } from './infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from './infrastructure/repository/outbox/outbox-message.repository';
import { MessageDestinationModule } from './infrastructure/message-bus/message-destination.module';
import { LazyLoadHandler } from './infrastructure/message-bus/lazy-load-handler.service';
import { HealthController } from './infrastructure/http/health.controller';
import { RabbitmqModule } from './infrastructure/message-bus/rabbitmq/config/rabbitmq.module';
import { createDynamicRabbitMqConfig } from './infrastructure/message-bus/rabbitmq/config/dynamic-rabbitmq.config';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature([InboxMessage, OutboxMessage]),
    MessageDestinationModule,
    RabbitmqModule.forRoot(createDynamicRabbitMqConfig('shared')),
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [InboxMessageRepository, OutboxMessageRepository, LazyLoadHandler],
  exports: [
    MikroOrmModule,
    MessageDestinationModule,
    InboxMessageRepository,
    OutboxMessageRepository,
    LazyLoadHandler,
    RabbitmqModule,
    RealtimeModule,
  ],
})
export class SharedModule {}
