import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';
import { OrderPlacedProcessorModule } from './order-placed/order-placed.module';
import { OrderPlacedProcessor } from './order-placed/order-placed.processor';
import { InventoryReservedProcessorModule } from './inventory-reserved/inventory-reserved.module';
import { InventoryReservedProcessor } from './inventory-reserved/inventory-reserved.processor';
import { InventoryReservationFailedProcessorModule } from './inventory-reservation-failed/inventory-reservation-failed.module';
import { InventoryReservationFailedProcessor } from './inventory-reservation-failed/inventory-reservation-failed.processor';
import { PaymentCompletedProcessorModule } from './payment-completed/payment-completed.module';
import { PaymentCompletedProcessor } from './payment-completed/payment-completed.processor';
import { PaymentFailedProcessorModule } from './payment-failed/payment-failed.module';
import { PaymentFailedProcessor } from './payment-failed/payment-failed.processor';
import { ShipmentCreatedProcessorModule } from './shipment-created/shipment-created.module';
import { ShipmentCreatedProcessor } from './shipment-created/shipment-created.processor';
import { ShipmentDeliveredProcessorModule } from './shipment-delivered/shipment-delivered.module';
import { ShipmentDeliveredProcessor } from './shipment-delivered/shipment-delivered.processor';
import { OrderCancelledProcessorModule } from './order-cancelled/order-cancelled.module';
import { OrderCancelledProcessor } from './order-cancelled/order-cancelled.processor';

@Injectable()
export class NotificationSignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
    this.signatureTypes = {
      OrderPlacedEvent: [
        this.lazyLoader.handle(
          OrderPlacedProcessorModule,
          OrderPlacedProcessor,
        ),
      ],
      InventoryReservedEvent: [
        this.lazyLoader.handle(
          InventoryReservedProcessorModule,
          InventoryReservedProcessor,
        ),
      ],
      InventoryReservationFailedEvent: [
        this.lazyLoader.handle(
          InventoryReservationFailedProcessorModule,
          InventoryReservationFailedProcessor,
        ),
      ],
      PaymentCompletedEvent: [
        this.lazyLoader.handle(
          PaymentCompletedProcessorModule,
          PaymentCompletedProcessor,
        ),
      ],
      PaymentFailedEvent: [
        this.lazyLoader.handle(
          PaymentFailedProcessorModule,
          PaymentFailedProcessor,
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
      OrderCancelledEvent: [
        this.lazyLoader.handle(
          OrderCancelledProcessorModule,
          OrderCancelledProcessor,
        ),
      ],
    };
  }
}
