import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { ShipmentRepository } from '../../repository/shipment.repository';
import { ShipmentStatus } from '../../../domain/shipment/enum/shipment-status.enum';

@Injectable()
export class OrderCancelledProcessor {
  private readonly logger = new Logger(OrderCancelledProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly inboxRepository: InboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return OrderCancelledProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_SHIPPING!;

    this.logger.log(`Processing OrderCancelledEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'OrderCancelledEvent',
      },
      schema,
    );

    const shipment = await this.shipmentRepository.findByOrderId(orderId);
    if (!shipment) {
      this.logger.warn(`No shipment found for order ${orderId} to cancel.`);
      return;
    }

    if (shipment.status === ShipmentStatus.CANCELLED) {
      this.logger.log(`Shipment for order ${orderId} is already CANCELLED.`);
      return;
    }

    if (shipment.status !== ShipmentStatus.PENDING) {
      this.logger.warn(
        `Cannot automatically cancel shipment ${shipment.id} in state '${shipment.status}' for order ${orderId}. Manual intervention required.`,
      );
      return;
    }

    // Cancel the shipment
    shipment.cancel();
    await this.shipmentRepository.save(shipment);

    this.logger.log(`Shipment for order ${orderId} cancelled successfully.`);
  }
}
