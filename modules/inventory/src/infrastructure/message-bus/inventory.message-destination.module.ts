import { Module, OnModuleInit } from '@nestjs/common';
import { MessageDestinationModule } from '@shared/infrastructure/message-bus/message-destination.module';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { registerInventoryMessageDestinations } from './inventory.message-destination';

@Module({
  imports: [MessageDestinationModule],
})
export class InventoryMessageDestinationModule implements OnModuleInit {
  constructor(
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {}

  onModuleInit(): void {
    registerInventoryMessageDestinations(this.messageDestinationRegistry);
  }
}
