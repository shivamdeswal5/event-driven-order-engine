import { ErrorMapper } from 'http-problem-details-mapper';
import {
  PaymentNotFoundExceptionMapper,
  InvalidPaymentStateExceptionMapper,
  PaymentAlreadyExistsExceptionMapper,
} from './mappers';

export class PaymentMapperRegistryFactory {
  static getMappers(): ErrorMapper[] {
    return [
      new PaymentNotFoundExceptionMapper(),
      new InvalidPaymentStateExceptionMapper(),
      new PaymentAlreadyExistsExceptionMapper(),
    ];
  }
}
