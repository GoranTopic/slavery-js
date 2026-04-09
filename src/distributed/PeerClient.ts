import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { RedisQueue, type JobPayload } from './RedisQueue.js';
import { ServiceRegistry, type ServiceEntry } from './ServiceRegistry.js';

/**
 * Client for calling methods on remote peer services via BullMQ.
 *
 * This is the mechanism through which one DistributedService (e.g. "users")
 * invokes a method on another DistributedService (e.g. "proxy").
 *
 * Resolution: local → direct BullMQ call (same process), distributed → Redis queue.
 */
export class PeerClient {
  private readonly queues   = new Map<string, RedisQueue>();
  private readonly events   = new Map<string, QueueEvents>();

  constructor(
    private readonly redis: Redis,
    private readonly registry: ServiceRegistry,
    private readonly selfName: string,
    private readonly timeout = 30_000,
  ) {}

  /**
   * Call `method` on the given remote `serviceName`.
   *
   * Resolves with the return value of the remote handler, or throws
   * if the remote job fails or if the target service is not registered.
   */
  async call<T = unknown>(serviceName: string, method: string, params: unknown): Promise<T> {
    const peer = await this.registry.getService(serviceName);
    if (!peer) {
      throw new Error(`[PeerClient] service "${serviceName}" not found in registry`);
    }
    if (!peer.methods.includes(method)) {
      throw new Error(
        `[PeerClient] service "${serviceName}" does not expose method "${method}". ` +
        `Available: ${peer.methods.join(', ')}`,
      );
    }

    const queueKey = `${serviceName}--${method}`;
    const queue    = this.getQueue(queueKey);
    const events   = await this.getEvents(queueKey);
    const payload: JobPayload = { method, parameters: params };
    const job = await queue.add(payload);
    return job.waitUntilFinished(events, this.timeout) as Promise<T>;
  }

  /**
   * List all currently available peer services (excluding self).
   */
  async peers(): Promise<ServiceEntry[]> {
    return this.registry.getPeers(this.selfName);
  }

  /**
   * Check whether a specific service is currently registered.
   */
  async hasPeer(serviceName: string): Promise<boolean> {
    return (await this.registry.getService(serviceName)) !== null;
  }

  async close(): Promise<void> {
    await Promise.all([
      ...Array.from(this.queues.values()).map(q => q.close()),
      ...Array.from(this.events.values()).map(e => e.close()),
    ]);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private getQueue(key: string): RedisQueue {
    if (!this.queues.has(key)) {
      this.queues.set(key, new RedisQueue(key, this.redis));
    }
    return this.queues.get(key)!;
  }

  private async getEvents(key: string): Promise<QueueEvents> {
    if (!this.events.has(key)) {
      const conn = new Redis(this.redis.options);
      const ev = new QueueEvents(key, { connection: conn });
      await ev.waitUntilReady();
      this.events.set(key, ev);
    }
    return this.events.get(key)!;
  }
}
