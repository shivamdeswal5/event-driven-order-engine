import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';

/**
 * RedisIoAdapter
 *
 * A Nest WebSocket adapter that wires the Socket.io server to a Redis backplane
 * via `@socket.io/redis-adapter`.
 *
 * With this adapter attached, the HTTP app's Socket.io server:
 *  - shares room membership + broadcasts across every process connected to the
 *    same Redis instance, and
 *  - receives emit commands published by CLI worker processes through
 *    `RedisRealtimeBroadcaster` (`@socket.io/redis-emitter`) and delivers them
 *    to the browser clients it holds locally.
 *
 * This is the standard pattern for scaling Socket.io horizontally.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const host = configService.get<string>('redis.host', 'localhost');
    const port = configService.get<number>('redis.port', 6379);

    this.pubClient = new Redis({ host, port, maxRetriesPerRequest: null });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) =>
      this.logger.error(`Redis pub client error: ${err.message}`),
    );
    this.subClient.on('error', (err) =>
      this.logger.error(`Redis sub client error: ${err.message}`),
    );

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log(`Socket.io Redis adapter connected to ${host}:${port}`);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
