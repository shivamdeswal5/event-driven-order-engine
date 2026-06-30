export class UpdateStockCommand {
  constructor(
    public readonly productId: string,
    public readonly adjustment: number,
  ) {}
}
