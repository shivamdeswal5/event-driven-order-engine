import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Transactional } from '@mikro-orm/core';
import { InboxMessageRepository } from '@shared/infrastructure/repository/inbox/inbox-message.repository';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';
import { Shipment } from '../../../domain/shipment/shipment.entity';
import { ShipmentRepository } from '../../repository/shipment.repository';
import { ShipmentStatus } from '../../../domain/shipment/enum/shipment-status.enum';
import { ShipmentCreatedEvent } from '../../../domain/shipment/events/shipment-created.event';

@Injectable()
export class PaymentCompletedProcessor {
  private readonly logger = new Logger(PaymentCompletedProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly inboxRepository: InboxMessageRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  getHandlerName(): string {
    return PaymentCompletedProcessor.name;
  }

  @Transactional()
  async handle(message: { messageId: string; body: any }): Promise<void> {
    const payload = message.body.payload || message.body;
    const orderId = payload.orderId;
    const schema = process.env.DB_SCHEMA_SHIPPING!;

    this.logger.log(`Processing PaymentCompletedEvent for order: ${orderId}`);

    // Deduplicate/Idempotency check
    await this.inboxRepository.storeInboxMessage(
      {
        messageId: message.messageId,
        handlerName: this.getHandlerName(),
        eventType: 'PaymentCompletedEvent',
      },
      schema,
    );

    // Check if shipment already exists to prevent duplicate processing
    let shipment = await this.shipmentRepository.findByOrderId(orderId);
    if (shipment) {
      this.logger.warn(
        `Shipment for order ${orderId} already exists. Skipping.`,
      );
      return;
    }

    // 1. Create shipment in PENDING status
    shipment = new Shipment();
    shipment.orderId = orderId;
    shipment.status = ShipmentStatus.PENDING;

    await this.shipmentRepository.save(shipment);

    // 2. Create the Outbox message
    const shipmentCreatedEvent = new ShipmentCreatedEvent({
      orderId: shipment.orderId,
      shipmentId: shipment.id,
    });

    await this.outboxRepository.storeOutboxMessage(shipmentCreatedEvent, {
      schema,
    });

    this.logger.log(`Shipment created successfully for order ${orderId}`);
  }
}
