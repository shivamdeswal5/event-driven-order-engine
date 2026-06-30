import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';
import { InventoryReservedProcessorModule } from './inventory-reserved/inventory-reserved.module';
import { InventoryReservedProcessor } from './inventory-reserved/inventory-reserved.processor';
import { OrderCancelledProcessorModule } from './order-cancelled/order-cancelled.module';
import { OrderCancelledProcessor } from './order-cancelled/order-cancelled.processor';

@Injectable()
export class PaymentSignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
    this.signatureTypes = {
      InventoryReservedEvent: [
        this.lazyLoader.handle(
          InventoryReservedProcessorModule,
          InventoryReservedProcessor,
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
