import { Injectable } from '@nestjs/common';
import { Shipment } from '../../domain/shipment/shipment.entity';
import { GetShipmentQuery } from './get-shipment.query';
import { ShipmentRepository } from '../../infrastructure/repository/shipment.repository';
import { ShipmentNotFoundException } from '../../domain/shipment/exceptions/shipment.exceptions';

@Injectable()
export class GetShipmentHandler {
  constructor(private readonly shipmentRepository: ShipmentRepository) {}

  async handle(query: GetShipmentQuery): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByOrderId(query.orderId);
    if (!shipment) {
      throw new ShipmentNotFoundException(query.orderId);
    }
    return shipment;
  }
}
