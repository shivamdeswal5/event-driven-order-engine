import { Global, Module } from '@nestjs/common';
import { MessageDestinationRegistry } from './message-destination-registry';

@Global()
@Module({
  providers: [MessageDestinationRegistry],
  exports: [MessageDestinationRegistry],
})
export class MessageDestinationModule {}
