import { Injectable } from '@nestjs/common';
import { ConfigType, RuntimeConfigOverrides } from '../rabbitmq.interface';

@Injectable()
export class RabbitmqRuntimeConfig {
  private runtimeConfig: RuntimeConfigOverrides = {};

  setRuntimeConfig(overrides: RuntimeConfigOverrides) {
    const cleanedOverrides = Object.fromEntries(
      Object.entries(overrides).filter(([_, v]) => v !== undefined),
    );
    this.runtimeConfig = { ...this.runtimeConfig, ...cleanedOverrides };
  }

  getRuntimeConfig(): RuntimeConfigOverrides {
    return this.runtimeConfig;
  }

  mergeWithBase(baseConfig: ConfigType): ConfigType {
    return { ...baseConfig, ...this.runtimeConfig };
  }
}
