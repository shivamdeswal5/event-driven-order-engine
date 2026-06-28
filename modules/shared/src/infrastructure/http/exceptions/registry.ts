import { ErrorMapper, MapperRegistry } from 'http-problem-details-mapper';
import { OrderMapperRegistryFactory } from '@order/infrastructure/http/exceptions/registry';

export class CombinedMapperRegistryFactory {
  static getMappers(): ErrorMapper[] {
    return [
      ...OrderMapperRegistryFactory.getMappers(),
    ];
  }

  static create(): MapperRegistry {
    const registry = new MapperRegistry({ useDefaultErrorMapper: false });
    this.getMappers().forEach((mapper) => registry.registerMapper(mapper));
    return registry;
  }
}
