import { ErrorMapper } from 'http-problem-details-mapper';
import {
  InvalidOrderStateExceptionMapper,
  OrderNotFoundExceptionMapper,
} from './mappers';

export class OrderMapperRegistryFactory {
  static getMappers(): ErrorMapper[] {
    return [
      new OrderNotFoundExceptionMapper(),
      new InvalidOrderStateExceptionMapper(),
    ];
  }
}
