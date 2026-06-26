import { ErrorMapper } from './strategy';

export class CombinedMapperRegistryFactory {
  private static mappers: ErrorMapper[] = [];

  static register(mappers: ErrorMapper[]) {
    this.mappers.push(...mappers);
  }

  static create(): ErrorMapper[] {
    return [...this.mappers];
  }
}
