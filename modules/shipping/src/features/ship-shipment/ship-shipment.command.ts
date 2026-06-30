export class ShipShipmentCommand {
  constructor(
    public readonly orderId: string,
    public readonly carrier: string,
    public readonly trackingNumber: string,
  ) {}
}
