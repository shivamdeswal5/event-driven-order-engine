export class AddProductCommand {
  constructor(
    public readonly name: string,
    public readonly sku: string,
    public readonly stockQuantity: number,
    public readonly unitPrice: number,
  ) {}
}
