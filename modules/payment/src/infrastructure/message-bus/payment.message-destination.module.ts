import { Module, OnModuleInit } from '@nestjs/common';
import { MessageDestinationModule } from '@shared/infrastructure/message-bus/message-destination.module';
import { MessageDestinationRegistry } from '@shared/infrastructure/message-bus/message-destination-registry';
import { registerPaymentMessageDestinations } from './payment.message-destination';

@Module({
  imports: [MessageDestinationModule],
})
export class PaymentMessageDestinationModule implements OnModuleInit {
  constructor(
    private readonly messageDestinationRegistry: MessageDestinationRegistry,
  ) {}

  onModuleInit(): void {
    registerPaymentMessageDestinations(this.messageDestinationRegistry);
  }
}
