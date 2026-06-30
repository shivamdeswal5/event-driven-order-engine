import { Module, OnModuleInit } from '@nestjs/common';
import { MessageDestinationModule } from '@shared/infrastructure/message-bus/message-destination.module';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { registerNotificationMessageDestinations } from './notification.message-destination';

@Module({
  imports: [MessageDestinationModule],
})
export class NotificationMessageDestinationModule implements OnModuleInit {
  constructor(
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {}

  onModuleInit(): void {
    registerNotificationMessageDestinations(this.messageDestinationRegistry);
  }
}
