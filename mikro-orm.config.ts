/**
 * Root MikroORM config — used by MikroOrmModule.forRoot() at runtime.
 *
 * Delegates to the context-aware factory in shared/infrastructure/database/config
 * using contextName='default', which discovers ALL entities across all modules.
 *
 * For migrations, use the CLI scripts in package.json which point directly to
 * the factory with a specific --contextName (e.g. --contextName=orders).
 */
import mikroOrmConfigFactory from './modules/shared/src/infrastructure/database/config/mikro-orm.config';

export default mikroOrmConfigFactory('default');
