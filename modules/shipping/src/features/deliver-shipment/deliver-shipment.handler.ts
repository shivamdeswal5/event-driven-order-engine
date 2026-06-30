import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { ShipmentRepository } from '../../infrastructure/repository/shipment.repository';
import { DeliverShipmentCommand } from './deliver-shipment.command';
import { ShipmentNotFoundException } from '../../domain/shipment/exceptions/shipment.exceptions';
import { ShipmentDeliveredEvent } from '../../domain/shipment/events/shipment-delivered.event';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';

@Injectable()
export class DeliverShipmentHandler {
  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  @Transactional()
  async handle(command: DeliverShipmentCommand): Promise<void> {
    const shipment = await this.shipmentRepository.findByOrderId(
      command.orderId,
    );
    if (!shipment) {
      throw new ShipmentNotFoundException(command.orderId);
    }

    shipment.deliver();
    await this.shipmentRepository.save(shipment);

    const deliveredEvent = new ShipmentDeliveredEvent({
      orderId: shipment.orderId,
      shipmentId: shipment.id,
      deliveredAt: shipment.deliveredAt!,
    });

    await this.outboxRepository.storeOutboxMessage(deliveredEvent, {
      schema: process.env.DB_SCHEMA_SHIPPING,
    });
  }
}
