import { ErrorMapper } from 'http-problem-details-mapper';
import { ProblemDocument } from 'http-problem-details';
import { HttpStatus } from '@nestjs/common';
import {
  ProductNotFoundException,
  SkuAlreadyExistsException,
  InsufficientStockException,
} from '../../../domain/product/exceptions/product.exceptions';
import { InvalidReservationStateException } from '../../../domain/reservation/exceptions/reservation.exceptions';

export class ProductNotFoundExceptionMapper extends ErrorMapper {
  constructor() {
    super(ProductNotFoundException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/product-not-found',
      title: 'Product Not Found',
      status: HttpStatus.NOT_FOUND,
      detail: exception.message,
    });
  }
}

export class SkuAlreadyExistsExceptionMapper extends ErrorMapper {
  constructor() {
    super(SkuAlreadyExistsException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/sku-already-exists',
      title: 'SKU Already Exists',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}

export class InsufficientStockExceptionMapper extends ErrorMapper {
  constructor() {
    super(InsufficientStockException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/insufficient-stock',
      title: 'Insufficient Stock',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}

export class InvalidReservationStateExceptionMapper extends ErrorMapper {
  constructor() {
    super(InvalidReservationStateException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/invalid-reservation-state',
      title: 'Invalid Reservation State',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}
