export class PlaceOrderCommandItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number,
  ) {}
}

export class PlaceOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: PlaceOrderCommandItem[],
  ) {}
}
