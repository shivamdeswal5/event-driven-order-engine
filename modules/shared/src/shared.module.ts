import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InboxMessage } from './domain/inbox/inbox-message.entity';
import { OutboxMessage } from './domain/outbox/outbox-message.entity';
import { InboxMessageRepository } from './infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from './infrastructure/repository/outbox/outbox-message.repository';
import { MessageDestinationModule } from './infrastructure/message-bus/message-destination.module';
import { LazyLoadHandler } from './infrastructure/message-bus/lazy-load-handler.service';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature([InboxMessage, OutboxMessage]),
    MessageDestinationModule,
  ],
  providers: [
    InboxMessageRepository,
    OutboxMessageRepository,
    LazyLoadHandler,
  ],
  exports: [
    MikroOrmModule,
    MessageDestinationModule,
    InboxMessageRepository,
    OutboxMessageRepository,
    LazyLoadHandler,
  ],
})
export class SharedModule {}
