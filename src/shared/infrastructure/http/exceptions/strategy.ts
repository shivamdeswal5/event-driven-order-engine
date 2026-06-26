export interface ProblemDetails {
  status: number;
  title: string;
  detail: string;
  type: string;
  instance?: string;
  [key: string]: any;
}

export interface ErrorMapper {
  errorName: string;
  mapError(error: Error): ProblemDetails;
}

export class MappingStrategy {
  private mappers: Map<string, (error: any) => ProblemDetails> = new Map();

  constructor(mappers: ErrorMapper[]) {
    mappers.forEach((mapper) => {
      this.mappers.set(mapper.errorName, (err) => mapper.mapError(err));
    });
  }

  map(error: Error): ProblemDetails | null {
    const errorName = error.constructor?.name || error.name;
    const mapper = this.mappers.get(errorName);
    if (mapper) {
      return mapper(error);
    }
    return null;
  }
}
