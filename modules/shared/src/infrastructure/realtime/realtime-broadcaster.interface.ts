/**
 * RealtimeBroadcaster — the realtime capability PORT (hexagonal architecture).
 *
 * This is a technology-agnostic contract for pushing a message to every client
 * currently subscribed to a room, from ANY backend process (HTTP app or CLI
 * worker). Business/feature modules depend on this interface, never on a
 * concrete transport (Redis, Kafka, in-memory, ...), so the transport is a
 * swappable detail (Dependency Inversion).
 *
 * The concrete implementation is bound to the REALTIME_BROADCASTER token in
 * `realtime.module.ts` (currently `RedisRealtimeBroadcaster`).
 */
export interface RealtimeBroadcaster {
  /**
   * Emit `event` with `payload` to every client in `room` under `namespace`.
   *
   * @param namespace Socket.io namespace (e.g. `/notifications`).
   * @param room      Room name (e.g. `order:<uuid>`).
   * @param event     Client-side event name (e.g. `notification`).
   * @param payload   Arbitrary JSON-serializable payload.
   */
  broadcastToRoom(
    namespace: string,
    room: string,
    event: string,
    payload: unknown,
  ): void;
}

/**
 * DI token for the RealtimeBroadcaster port. Inject with
 * `@Inject(REALTIME_BROADCASTER)` to receive the bound adapter.
 */
export const REALTIME_BROADCASTER = Symbol('RealtimeBroadcaster');
