import { ErrorMapper } from 'http-problem-details-mapper';
import { ProblemDocument } from 'http-problem-details';
import { HttpStatus } from '@nestjs/common';
import {
  ShipmentNotFoundException,
  InvalidShipmentStateException,
  ShipmentAlreadyExistsException,
} from '../../../domain/shipment/exceptions/shipment.exceptions';

export class ShipmentNotFoundExceptionMapper extends ErrorMapper {
  constructor() {
    super(ShipmentNotFoundException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/shipment-not-found',
      title: 'Shipment Not Found',
      status: HttpStatus.NOT_FOUND,
      detail: exception.message,
    });
  }
}

export class InvalidShipmentStateExceptionMapper extends ErrorMapper {
  constructor() {
    super(InvalidShipmentStateException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/invalid-shipment-state',
      title: 'Invalid Shipment State',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}

export class ShipmentAlreadyExistsExceptionMapper extends ErrorMapper {
  constructor() {
    super(ShipmentAlreadyExistsException);
  }

  mapError(error: Error): ProblemDocument {
    const exception = error;
    return new ProblemDocument({
      type: 'https://api.order-engine.com/errors/shipment-already-exists',
      title: 'Shipment Already Exists',
      status: HttpStatus.CONFLICT,
      detail: exception.message,
    });
  }
}
