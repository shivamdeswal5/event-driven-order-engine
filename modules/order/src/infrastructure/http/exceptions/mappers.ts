import { ErrorMapper } from 'http-problem-details-mapper';
import {
  ProblemDocument,
  ProblemDocumentExtension,
} from 'http-problem-details';
import { HttpStatus } from '@nestjs/common';
import {
  InvalidOrderStateException,
  OrderNotFoundException,
} from '../../../domain/order/exceptions/order.exceptions';

export class OrderNotFoundExceptionMapper extends ErrorMapper {
  constructor() {
    super(OrderNotFoundException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error as OrderNotFoundException;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/order-not-found',
      title: 'Order Not Found',
      status: HttpStatus.NOT_FOUND,
      detail: exception.message,
    });
  }
}

export class InvalidOrderStateExceptionMapper extends ErrorMapper {
  constructor() {
    super(InvalidOrderStateException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error as InvalidOrderStateException;
    const extension = new ProblemDocumentExtension({
      currentState: exception.currentState,
      action: exception.action,
    });

    return new ProblemDocument(
      {
        type: 'https://api.order-engine.com/errors/invalid-order-state',
        title: 'Invalid Order State',
        status: HttpStatus.CONFLICT,
        detail: exception.message,
      },
      extension,
    );
  }
}
