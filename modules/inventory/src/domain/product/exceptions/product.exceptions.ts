import {
  NotFoundException,
  ConflictException,
} from '@shared/infrastructure/http/exceptions/exceptions';

export class ProductNotFoundException extends NotFoundException {
  constructor(productIdOrSku: string) {
    super(`Product with ID or SKU "${productIdOrSku}" was not found.`);
  }
}

export class SkuAlreadyExistsException extends ConflictException {
  constructor(sku: string) {
    super(`SKU "${sku}" already exists.`);
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested ${requested}, but only ${available} is available.`,
    );
  }
}
