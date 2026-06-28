import { registerAs } from '@nestjs/config';

/**
 * Application configuration.
 *
 * Centralizes all environment variables into a typed config object.
 * Access via ConfigService: configService.get('app.port')
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
}));

export const databaseConfig = registerAs('database', () => ({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'order_engine',
  user:     process.env.DB_USER     || 'order_user',
  password: process.env.DB_PASSWORD || 'order_pass',
  schemas: {
    shared:       process.env.DB_SCHEMA_SHARED       || 'shared_schema',
    order:        process.env.DB_SCHEMA_ORDER        || 'order_schema',
    inventory:    process.env.DB_SCHEMA_INVENTORY    || 'inventory_schema',
    payment:      process.env.DB_SCHEMA_PAYMENT      || 'payment_schema',
    shipping:     process.env.DB_SCHEMA_SHIPPING     || 'shipping_schema',
    notification: process.env.DB_SCHEMA_NOTIFICATION || 'notification_schema',
  },
}));

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url:           process.env.RABBITMQ_URL           || 'amqp://rabbit_user:rabbit_pass@localhost:5672',
  managementUrl: process.env.RABBITMQ_MANAGEMENT_URL || 'http://localhost:15672',
  user:          process.env.RABBITMQ_USER          || 'rabbit_user',
  password:      process.env.RABBITMQ_PASSWORD      || 'rabbit_pass',
  prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT || '10', 10),
  maxRetries:    parseInt(process.env.RABBITMQ_MAX_RETRIES    || '3',  10),
}));

export const outboxConfig = registerAs('outbox', () => ({
  pollingIntervalMs: parseInt(process.env.OUTBOX_POLLING_INTERVAL_MS || '5000', 10),
  batchSize:         parseInt(process.env.OUTBOX_BATCH_SIZE          || '100',  10),
}));
