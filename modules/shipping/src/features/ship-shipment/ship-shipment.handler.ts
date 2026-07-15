import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { ShipmentRepository } from '../../infrastructure/repository/shipment.repository';
import { ShipShipmentCommand } from './ship-shipment.command';
import { ShipmentNotFoundException } from '../../domain/shipment/exceptions/shipment.exceptions';
import { ShipmentShippedEvent } from '../../domain/shipment/events/shipment-shipped.event';
import { OutboxMessageRepository } from '@shared/infrastructure/repository/outbox/outbox-message.repository';

@Injectable()
export class ShipShipmentHandler {
  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly outboxRepository: OutboxMessageRepository,
  ) {}

  @Transactional()
  async handle(command: ShipShipmentCommand): Promise<void> {
    const shipment = await this.shipmentRepository.findByOrderId(
      command.orderId,
    );
    if (!shipment) {
      throw new ShipmentNotFoundException(command.orderId);
    }

    shipment.ship(command.carrier, command.trackingNumber);
    await this.shipmentRepository.save(shipment);

    const shippedEvent = new ShipmentShippedEvent({
      orderId: shipment.orderId,
      shipmentId: shipment.id,
      carrier: shipment.carrier!,
      trackingNumber: shipment.trackingNumber!,
      shippedAt: shipment.shippedAt!,
    });

    await this.outboxRepository.storeOutboxMessage(shippedEvent, {
      schema: process.env.DB_SCHEMA_SHIPPING,
    });
  }
}
