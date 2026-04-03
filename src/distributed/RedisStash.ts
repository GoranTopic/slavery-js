import type { Redis } from 'ioredis';

/**
 * Redis-backed shared state store.
 * Drop-in replacement for the in-memory Stash for distributed deployments.
 * All values must be JSON-serializable.
 */
export class RedisStash {
  constructor(
    private readonly client: Redis,
    private readonly namespace: string,
  ) {}

  private key(name: string): string {
    return `${this.namespace}:stash:${name}`;
  }

  async get(name = '_default'): Promise<unknown> {
    const raw = await this.client.get(this.key(name));
    return raw !== null ? (JSON.parse(raw) as unknown) : null;
  }

  async set(name = '_default', value?: unknown): Promise<void> {
    // JSON.stringify(undefined) returns undefined (not a string), which Redis
    // stores as "". Store null explicitly so JSON.parse on get never throws.
    await this.client.set(this.key(name), JSON.stringify(value ?? null));
  }

  async del(name = '_default'): Promise<void> {
    await this.client.del(this.key(name));
  }

  async keys(): Promise<string[]> {
    const pattern = `${this.namespace}:stash:*`;
    const found = await this.client.keys(pattern);
    const prefix = `${this.namespace}:stash:`;
    return found.map((k) => k.slice(prefix.length));
  }
}
