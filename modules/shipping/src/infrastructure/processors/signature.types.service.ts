import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';
import { PaymentCompletedProcessorModule } from './payment-completed/payment-completed.module';
import { PaymentCompletedProcessor } from './payment-completed/payment-completed.processor';
import { OrderCancelledProcessorModule } from './order-cancelled/order-cancelled.module';
import { OrderCancelledProcessor } from './order-cancelled/order-cancelled.processor';

@Injectable()
export class ShippingSignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
    this.signatureTypes = {
      PaymentCompletedEvent: [
        this.lazyLoader.handle(
          PaymentCompletedProcessorModule,
          PaymentCompletedProcessor,
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
