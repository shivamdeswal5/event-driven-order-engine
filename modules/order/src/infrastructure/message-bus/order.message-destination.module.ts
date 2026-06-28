import { Module, OnModuleInit } from '@nestjs/common';
import { MessageDestinationModule } from '@shared/infrastructure/message-bus/message-destination.module';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { registerOrderMessageDestinations } from './order.message-destination';

@Module({
  imports: [MessageDestinationModule],
})
export class OrderMessageDestinationModule implements OnModuleInit {
  constructor(private readonly messageDestinationRegistry: MessageDestinationRegistry) {}

  onModuleInit() {
    registerOrderMessageDestinations(this.messageDestinationRegistry);
  }
}
