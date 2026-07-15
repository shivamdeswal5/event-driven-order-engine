import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';
import { RealtimeBroadcaster } from '../realtime-broadcaster.interface';

/**
 * RedisRealtimeBroadcaster
 *
 * Redis ADAPTER for the {@link RealtimeBroadcaster} port. Publishes emit
 * commands into the Redis Socket.io backplane so they reach browser clients
 * regardless of which process produced them.
 *
 * WHY THIS EXISTS
 * ---------------
 * Socket.io connections are stateful and live inside the HTTP application
 * process (where browsers connect). Domain events, however, are processed by
 * separate CLI worker processes (`handle-messages --module=notification`),
 * which have no HTTP/WebSocket server of their own. A worker therefore cannot
 * emit directly into sockets it does not own.
 *
 * The Redis adapter/emitter pair bridges this process boundary: the worker uses
 * this emitter to PUBLISH an emit command to Redis; the HTTP app's Socket.io
 * server (running the Redis adapter, see `redis-io.adapter.ts`) receives it and
 * delivers the payload to the connected clients in the target room. This is also
 * exactly how Socket.io scales horizontally across many app instances.
 *
 * The emitter's default Redis key prefix ("socket.io") and the adapter's default
 * prefix must match — both use the default here, so no extra config is needed.
 *
 * This class is intentionally domain-agnostic: it knows nothing about orders,
 * notifications, or event shapes. Module-specific semantics live in the feature
 * module (e.g. `NotificationBroadcaster`).
 */
@Injectable()
export class RedisRealtimeBroadcaster
  implements RealtimeBroadcaster, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisRealtimeBroadcaster.name);
  private redisClient?: Redis;
  private emitter?: Emitter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    this.redisClient = new Redis({
      host,
      port,
      lazyConnect: false,
      maxRetriesPerRequest: null,
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis broadcaster client error: ${err.message}`);
    });
    this.redisClient.on('connect', () => {
      this.logger.log(
        `Realtime broadcaster connected to Redis at ${host}:${port}`,
      );
    });

    this.emitter = new Emitter(this.redisClient);
  }

  broadcastToRoom(
    namespace: string,
    room: string,
    event: string,
    payload: unknown,
  ): void {
    if (!this.emitter) {
      this.logger.warn(
        'Realtime broadcaster not initialized; skipping broadcast. This should not happen after onModuleInit.',
      );
      return;
    }

    this.emitter.of(namespace).to(room).emit(event, payload);
    this.logger.log(
      `Published event "${event}" to room "${room}" (namespace "${namespace}") via Redis`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient?.quit();
  }
}
