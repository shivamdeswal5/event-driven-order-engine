import { ShipmentStatus } from '../../domain/shipment/enum/shipment-status.enum';

export class ListShipmentsQuery {
  constructor(
    public readonly status?: ShipmentStatus,
    public readonly limit: number = 10,
    public readonly offset: number = 0,
  ) {}
}
