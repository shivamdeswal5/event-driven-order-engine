import { Module } from '@nestjs/common';
import { REALTIME_BROADCASTER } from './realtime-broadcaster.interface';
import { RedisRealtimeBroadcaster } from './redis/redis-realtime-broadcaster.service';

/**
 * Binds the RealtimeBroadcaster port to its Redis adapter.
 *
 * To swap the transport (e.g. Kafka, NATS, or an in-memory fake for tests),
 * change only the `useClass` here — no feature module needs to change.
 *
 * Re-exported by `SharedModule` (which is `@Global`), so the HTTP app and every
 * CLI worker can inject `@Inject(REALTIME_BROADCASTER)` without importing this
 * module directly.
 */
@Module({
  providers: [
    { provide: REALTIME_BROADCASTER, useClass: RedisRealtimeBroadcaster },
  ],
  exports: [REALTIME_BROADCASTER],
})
export class RealtimeModule {}
