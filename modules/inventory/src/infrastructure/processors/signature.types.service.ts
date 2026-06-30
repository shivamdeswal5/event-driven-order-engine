import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';
import { OrderPlacedProcessorModule } from './order-placed/order-placed.module';
import { OrderPlacedProcessor } from './order-placed/order-placed.processor';
import { OrderCancelledProcessorModule } from './order-cancelled/order-cancelled.module';
import { OrderCancelledProcessor } from './order-cancelled/order-cancelled.processor';

@Injectable()
export class InventorySignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
    this.signatureTypes = {
      OrderPlacedEvent: [
        this.lazyLoader.handle(
          OrderPlacedProcessorModule,
          OrderPlacedProcessor,
        ),
      ],
      OrderCancelledEvent: [
        this.lazyLoader.handle(
          OrderCancelledProcessorModule,
          OrderCancelledProcessor,
        ),
      ],
    };
  }
}
