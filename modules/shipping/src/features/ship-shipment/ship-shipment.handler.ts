import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { ShipmentRepository } from '../../infrastructure/repository/shipment.repository';
import { ShipShipmentCommand } from './ship-shipment.command';
import { ShipmentNotFoundException } from '../../domain/shipment/exceptions/shipment.exceptions';

@Injectable()
export class ShipShipmentHandler {
  constructor(private readonly shipmentRepository: ShipmentRepository) {}

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
  }
}
