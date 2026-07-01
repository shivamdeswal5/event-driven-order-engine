import { CommandFactory } from 'nest-commander';
import {
  CONSUMER_MODULE_MAP,
  PRODUCER_MODULE_MAP,
} from './module.map';

async function bootstrap() {
  const command = process.argv[2];

  const getModuleAndStripArgv = () => {
    const moduleIndex = process.argv.findIndex((arg) => arg === '--module');
    if (moduleIndex !== -1 && process.argv[moduleIndex + 1]) {
      const module = process.argv[moduleIndex + 1];
      process.argv.splice(moduleIndex, 2);
      return module;
    }

    const moduleEqualsIndex = process.argv.findIndex((arg) =>
      arg.startsWith('--module='),
    );
    if (moduleEqualsIndex !== -1) {
      const module = process.argv[moduleEqualsIndex].split('=')[1];
      process.argv.splice(moduleEqualsIndex, 1);
      return module;
    }

    return undefined;
  };

  const module = getModuleAndStripArgv();

  if (module) {
    const hasSchema = process.argv.some(
      (arg) =>
        arg === '--schema' ||
        arg === '-s' ||
        arg.startsWith('--schema=') ||
        arg.startsWith('-s='),
    );
    if (!hasSchema) {
      process.argv.push('--schema', module);
    }
  }

  if (command === 'dispatch-messages') {
    if (!module || !PRODUCER_MODULE_MAP[module]) {
      throw new Error(
        `Invalid or missing --module. Available modules: ${Object.keys(
          PRODUCER_MODULE_MAP,
        ).join(', ')}`,
      );
    }

    await CommandFactory.runWithoutClosing(PRODUCER_MODULE_MAP[module], [
      'warn',
      'error',
    ]);
  }

  if (command === 'handle-messages') {
    if (!module || !CONSUMER_MODULE_MAP[module]) {
      throw new Error(
        `Invalid or missing --module. Available modules: ${Object.keys(
          CONSUMER_MODULE_MAP,
        ).join(', ')}`,
      );
    }

    await CommandFactory.runWithoutClosing(CONSUMER_MODULE_MAP[module], [
      'warn',
      'error',
    ]);
  }


}

bootstrap();
