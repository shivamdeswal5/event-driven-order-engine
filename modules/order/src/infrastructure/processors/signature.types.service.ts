import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';
import { InventoryReservationFailedProcessorModule } from './inventory-reservation-failed/inventory-reservation-failed.module';
import { InventoryReservationFailedProcessor } from './inventory-reservation-failed/inventory-reservation-failed.processor';
import { PaymentFailedProcessorModule } from './payment-failed/payment-failed.module';
import { PaymentFailedProcessor } from './payment-failed/payment-failed.processor';
import { PaymentCompletedProcessorModule } from './payment-completed/payment-completed.module';
import { PaymentCompletedProcessor } from './payment-completed/payment-completed.processor';
import { ShipmentCreatedProcessorModule } from './shipment-created/shipment-created.module';
import { ShipmentCreatedProcessor } from './shipment-created/shipment-created.processor';
import { ShipmentDeliveredProcessorModule } from './shipment-delivered/shipment-delivered.module';
import { ShipmentDeliveredProcessor } from './shipment-delivered/shipment-delivered.processor';

@Injectable()
export class OrderSignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
    this.signatureTypes = {
      InventoryReservationFailedEvent: [
        this.lazyLoader.handle(
          InventoryReservationFailedProcessorModule,
          InventoryReservationFailedProcessor,
        ),
      ],
      PaymentFailedEvent: [
        this.lazyLoader.handle(
          PaymentFailedProcessorModule,
          PaymentFailedProcessor,
        ),
      ],
      PaymentCompletedEvent: [
        this.lazyLoader.handle(
          PaymentCompletedProcessorModule,
          PaymentCompletedProcessor,
        ),
      ],
      ShipmentCreatedEvent: [
        this.lazyLoader.handle(
          ShipmentCreatedProcessorModule,
          ShipmentCreatedProcessor,
        ),
      ],
      ShipmentDeliveredEvent: [
        this.lazyLoader.handle(
          ShipmentDeliveredProcessorModule,
          ShipmentDeliveredProcessor,
        ),
      ],
    };
  }
}
