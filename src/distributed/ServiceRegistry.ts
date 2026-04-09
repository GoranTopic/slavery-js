import type { Redis } from 'ioredis';

/**
 * Service registration entry stored in Redis.
 */
export interface ServiceEntry {
  serviceName: string;
  methods: string[];
  /** ISO timestamp of last heartbeat */
  heartbeat: string;
  /** Arbitrary metadata (e.g. host, port for HTTP) */
  meta?: Record<string, unknown>;
}

const REGISTRY_KEY = 'slavery:registry';
const HEARTBEAT_INTERVAL = 10_000;
const TTL_SECONDS = 30;

/**
 * Redis-backed service registry.
 *
 * Each DistributedService registers itself on startup, sends periodic
 * heartbeats, and deregisters on shutdown.  Other services query the
 * registry to discover available peers and their methods.
 *
 * Stale entries (no heartbeat within TTL) are pruned on every read.
 */
export class ServiceRegistry {
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly redis: Redis) {}

  async register(entry: ServiceEntry): Promise<void> {
    entry.heartbeat = new Date().toISOString();
    await this.redis.hset(REGISTRY_KEY, entry.serviceName, JSON.stringify(entry));
    this.startHeartbeat(entry);
  }

  async deregister(serviceName: string): Promise<void> {
    this.stopHeartbeat();
    await this.redis.hdel(REGISTRY_KEY, serviceName);
  }

  async getService(serviceName: string): Promise<ServiceEntry | null> {
    const raw = await this.redis.hget(REGISTRY_KEY, serviceName);
    if (!raw) return null;
    const entry = JSON.parse(raw) as ServiceEntry;
    if (this.isStale(entry)) {
      await this.redis.hdel(REGISTRY_KEY, serviceName);
      return null;
    }
    return entry;
  }

  async getAllServices(): Promise<ServiceEntry[]> {
    const all = await this.redis.hgetall(REGISTRY_KEY);
    const entries: ServiceEntry[] = [];
    for (const [name, raw] of Object.entries(all)) {
      const entry = JSON.parse(raw) as ServiceEntry;
      if (this.isStale(entry)) {
        await this.redis.hdel(REGISTRY_KEY, name);
      } else {
        entries.push(entry);
      }
    }
    return entries;
  }

  async getPeers(excludeSelf: string): Promise<ServiceEntry[]> {
    const all = await this.getAllServices();
    return all.filter(e => e.serviceName !== excludeSelf);
  }

  close(): void {
    this.stopHeartbeat();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private startHeartbeat(entry: ServiceEntry): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      entry.heartbeat = new Date().toISOString();
      await this.redis.hset(REGISTRY_KEY, entry.serviceName, JSON.stringify(entry))
        .catch((err) => console.error(`[ServiceRegistry] heartbeat failed for ${entry.serviceName}:`, err.message));
    }, HEARTBEAT_INTERVAL);
    this.heartbeatTimer.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private isStale(entry: ServiceEntry): boolean {
    const age = Date.now() - new Date(entry.heartbeat).getTime();
    return age > TTL_SECONDS * 1000;
  }
}
