import { ErrorMapper } from 'http-problem-details-mapper';
import { ProblemDocument } from 'http-problem-details';
import { HttpStatus } from '@nestjs/common';
import {
  PaymentNotFoundException,
  InvalidPaymentStateException,
  PaymentAlreadyExistsException,
} from '../../../domain/payment/exceptions/payment.exceptions';

export class PaymentNotFoundExceptionMapper extends ErrorMapper {
  constructor() {
    super(PaymentNotFoundException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/payment-not-found',
      title: 'Payment Not Found',
      status: HttpStatus.NOT_FOUND,
      detail: exception.message,
    });
  }
}

export class InvalidPaymentStateExceptionMapper extends ErrorMapper {
  constructor() {
    super(InvalidPaymentStateException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/invalid-payment-state',
      title: 'Invalid Payment State',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}

export class PaymentAlreadyExistsExceptionMapper extends ErrorMapper {
  constructor() {
    super(PaymentAlreadyExistsException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/payment-already-exists',
      title: 'Payment Already Exists',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}
