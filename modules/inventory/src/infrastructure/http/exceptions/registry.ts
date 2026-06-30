import { ErrorMapper } from 'http-problem-details-mapper';
import {
  ProductNotFoundExceptionMapper,
  SkuAlreadyExistsExceptionMapper,
  InsufficientStockExceptionMapper,
  InvalidReservationStateExceptionMapper,
} from './mappers';

export class InventoryMapperRegistryFactory {
  static getMappers(): ErrorMapper[] {
    return [
      new ProductNotFoundExceptionMapper(),
      new SkuAlreadyExistsExceptionMapper(),
      new InsufficientStockExceptionMapper(),
      new InvalidReservationStateExceptionMapper(),
    ];
  }
}
