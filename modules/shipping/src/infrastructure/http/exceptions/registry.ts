import { ErrorMapper } from 'http-problem-details-mapper';
import {
  ShipmentNotFoundExceptionMapper,
  InvalidShipmentStateExceptionMapper,
  ShipmentAlreadyExistsExceptionMapper,
} from './mappers';

export class ShippingMapperRegistryFactory {
  static getMappers(): ErrorMapper[] {
    return [
      new ShipmentNotFoundExceptionMapper(),
      new InvalidShipmentStateExceptionMapper(),
      new ShipmentAlreadyExistsExceptionMapper(),
    ];
  }
}
