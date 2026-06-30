import { Module, OnModuleInit } from '@nestjs/common';
import { MessageDestinationModule } from '@shared/infrastructure/message-bus/message-destination.module';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { registerShippingMessageDestinations } from './shipping.message-destination';

@Module({
  imports: [MessageDestinationModule],
})
export class ShippingMessageDestinationModule implements OnModuleInit {
  constructor(
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {}

  onModuleInit(): void {
    registerShippingMessageDestinations(this.messageDestinationRegistry);
  }
}
