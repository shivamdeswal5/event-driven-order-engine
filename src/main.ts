import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

/**
 * Application bootstrap.
 *
 * Sets up:
 * 1. CORS — so a future frontend (or Postman) can call the API
 * 2. Global ValidationPipe — auto-validates all incoming DTOs
 * 3. Swagger — auto-generated API docs at /api/docs
 * 4. Listens on APP_PORT from environment
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ─── CORS ───────────────────────────────────────────────
  // Allows requests from other origins (future frontend, Postman, etc.)
  app.enableCors({
    origin: '*', // Open for development; restrict in production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // ─── Global Prefix ──────────────────────────────────────
  // All routes start with /api (e.g., /api/orders, /api/products)
  app.setGlobalPrefix('api');

  // ─── Global Validation ──────────────────────────────────
  // Automatically validates DTOs using class-validator decorators.
  // - whitelist: strips properties not in the DTO
  // - forbidNonWhitelisted: throws if unknown properties are sent
  // - transform: auto-converts types (e.g., string "1" → number 1)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger / OpenAPI ──────────────────────────────────
  // Auto-generates API documentation from NestJS decorators.
  // Visit http://localhost:8080/api/docs to see the UI.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Order Fulfillment Engine')
    .setDescription(
      'Resilient Event-Driven Order Fulfillment Engine — ' +
        'DDD, Vertical Slice Architecture, RabbitMQ',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ─── Start Server ───────────────────────────────────────
  const port = configService.get<number>('app.port', 8080);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`🐰 RabbitMQ Management: http://localhost:15672`);
}

bootstrap();
