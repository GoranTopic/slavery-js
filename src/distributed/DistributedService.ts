import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import http from 'node:http';
import { RedisStash } from './RedisStash.js';
import { RedisQueue, type JobPayload } from './RedisQueue.js';

export interface DistributedServiceOptions {
  /** Logical service name — used as queue namespace */
  serviceName: string;
  /** ioredis-compatible connection string, e.g. redis://redis-service:6379 */
  redisUrl: string;
  /** HTTP port for /health, /ready, /metrics  (default: 3000) */
  port?: number;
  /** Job result wait timeout in ms (default: 30 000) */
  timeout?: number;
}

/**
 * Distributed replacement for the monolithic Service master.
 *
 * Instead of forking child processes via cluster.fork() and communicating
 * via Socket.IO on localhost, DistributedService enqueues jobs to Redis
 * (BullMQ) and waits for results.  Workers running in separate containers
 * (DistributedWorker) pull and process jobs asynchronously.
 *
 * Health endpoints are served on the configured HTTP port so Kubernetes
 * liveness/readiness probes work out of the box.
 */
export class DistributedService {
  private readonly name: string;
  private readonly redis: Redis;
  private readonly stash: RedisStash;
  private readonly queues = new Map<string, RedisQueue>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private readonly timeout: number;
  private readonly server: http.Server;
  private readonly startTime = Date.now();

  constructor(options: DistributedServiceOptions) {
    this.name = options.serviceName;
    this.timeout = options.timeout ?? 30_000;

    // BullMQ requires maxRetriesPerRequest: null
    this.redis = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    this.stash = new RedisStash(this.redis, this.name);
    this.server = this.createHttpServer(options.port ?? 3000);

    this.redis.on('error', (err: Error) =>
      this.log('error', 'redis_error', { message: (err as Error).message }),
    );
    this.log('info', 'service_started', { service: this.name });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Enqueue a job for the named slave method and await its result.
   * Mirrors the existing service.methodName(params) call pattern.
   */
  async run<T = unknown>(method: string, parameters: unknown): Promise<T> {
    const queue = this.getQueue(method);
    const events = this.getQueueEvents(method);
    const payload: JobPayload = { method, parameters };
    const job = await queue.add(payload);

    this.log('debug', 'job_enqueued', { method, jobId: job.id });
    return job.waitUntilFinished(events, this.timeout) as Promise<T>;
  }

  /** Redis-backed shared stash — readable by both API and workers */
  get sharedStash(): RedisStash {
    return this.stash;
  }

  async close(): Promise<void> {
    this.log('info', 'service_closing', {});
    await Promise.all([
      ...Array.from(this.queues.values()).map((q) => q.close()),
      ...Array.from(this.queueEvents.values()).map((e) => e.close()),
    ]);
    this.redis.disconnect();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    this.log('info', 'service_closed', {});
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private getQueue(method: string): RedisQueue {
    // BullMQ forbids ':' in queue names — use '--' as separator.
    const key = `${this.name}--${method}`;
    if (!this.queues.has(key)) {
      this.queues.set(key, new RedisQueue(key, this.redis));
    }
    return this.queues.get(key)!;
  }

  private getQueueEvents(method: string): QueueEvents {
    // BullMQ forbids ':' in queue names — use '--' as separator.
    const key = `${this.name}--${method}`;
    if (!this.queueEvents.has(key)) {
      // QueueEvents needs its own blocking connection (SUBSCRIBE)
      const conn = new Redis(this.redis.options);
      const ev = new QueueEvents(key, { connection: conn });
      this.queueEvents.set(key, ev);
    }
    return this.queueEvents.get(key)!;
  }

  private createHttpServer(port: number): http.Server {
    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '/';

      if (url === '/health' || url === '/healthz') {
        try {
          await this.redis.ping();
          this.json(res, 200, {
            status: 'healthy',
            uptime_ms: Date.now() - this.startTime,
          });
        } catch {
          this.json(res, 503, { status: 'unhealthy', reason: 'redis_unreachable' });
        }
      } else if (url === '/ready') {
        this.json(res, 200, { status: 'ready' });
      } else if (url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(await this.prometheusMetrics());
      } else {
        this.json(res, 404, { error: 'not_found' });
      }
    });

    server.listen(port, () =>
      this.log('info', 'http_server_listening', { port }),
    );
    return server;
  }

  private async prometheusMetrics(): Promise<string> {
    const uptime = (Date.now() - this.startTime) / 1000;
    const lines: string[] = [
      `# HELP slavery_uptime_seconds Service uptime`,
      `# TYPE slavery_uptime_seconds gauge`,
      `slavery_uptime_seconds{service="${this.name}"} ${uptime}`,
      `# HELP slavery_queue_waiting Jobs waiting in queue`,
      `# TYPE slavery_queue_waiting gauge`,
      `# HELP slavery_queue_active Jobs currently being processed`,
      `# TYPE slavery_queue_active gauge`,
      `# HELP slavery_queue_completed_total Total completed jobs`,
      `# TYPE slavery_queue_completed_total counter`,
      `# HELP slavery_queue_failed_total Total failed jobs`,
      `# TYPE slavery_queue_failed_total counter`,
    ];

    for (const [key, queue] of this.queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.waitingCount(),
        queue.activeCount(),
        queue.completedCount(),
        queue.failedCount(),
      ]);
      lines.push(
        `slavery_queue_waiting{queue="${key}"} ${waiting}`,
        `slavery_queue_active{queue="${key}"} ${active}`,
        `slavery_queue_completed_total{queue="${key}"} ${completed}`,
        `slavery_queue_failed_total{queue="${key}"} ${failed}`,
      );
    }
    return lines.join('\n') + '\n';
  }

  private json(res: http.ServerResponse, status: number, body: object): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private log(level: string, event: string, extra: object): void {
    console.log(
      JSON.stringify({
        level,
        event,
        service: this.name,
        ts: new Date().toISOString(),
        ...extra,
      }),
    );
  }
}
