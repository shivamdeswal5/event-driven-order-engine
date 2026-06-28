import { Injectable, Type } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Injectable()
export class LazyLoadHandler {
  constructor(private readonly lazyLoader: LazyModuleLoader) {}

  createFactory<T>(module: Type<any>, handler: Type<T>): () => Promise<T> {
    return async () => {
      try {
        const moduleRef = await this.lazyLoader.load(() => module);
        return moduleRef.get(handler);
      } catch (err: any) {
        console.error(
          `Failed to lazy load handler '${handler.name}' in module '${module.name}': ${err.message}`,
        );
        throw err;
      }
    };
  }

  async handle(module: Type<any>, handler: Type<any>): Promise<any> {
    const factory = this.createFactory(module, handler);
    return factory();
  }
}
