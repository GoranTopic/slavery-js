import { Worker as BullWorker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import http from 'node:http';
import { RedisStash } from './RedisStash.js';
import type { JobPayload } from './RedisQueue.js';

export type SlaveMethod<P = unknown, R = unknown> = (
  parameters: P,
  context: { stash: RedisStash; jobId: string },
) => Promise<R>;

export type SlaveMethods = Record<string, SlaveMethod>;

export interface DistributedWorkerOptions {
  /** Must match the serviceName used by DistributedService */
  serviceName: string;
  /** Slave method implementations — same signature as existing slaveMethods */
  methods: SlaveMethods;
  /** ioredis-compatible connection string */
  redisUrl: string;
  /**
   * How many jobs this worker processes concurrently per method (default: 1).
   * Increase for I/O-bound slaves; keep at 1 for CPU-bound work.
   */
  concurrency?: number;
  /** HTTP port for /health and /ready (default: 3001) */
  healthPort?: number;
}

/**
 * Distributed replacement for Node/NodeManager (worker side).
 *
 * Each instance subscribes to BullMQ queues for every slave method and
 * processes jobs as they arrive.  Workers are completely stateless — any
 * shared state is stored in the Redis-backed RedisStash.
 *
 * Run as a standalone container; scale via Kubernetes HPA or KEDA.
 */
export class DistributedWorker {
  private readonly workers: BullWorker[] = [];
  private readonly redis: Redis;
  private readonly stash: RedisStash;
  private readonly server: http.Server;
  private readonly name: string;

  constructor(options: DistributedWorkerOptions) {
    this.name = options.serviceName;

    // Primary connection — used for stash reads/writes
    this.redis = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    this.stash = new RedisStash(this.redis, this.name);

    for (const [method, handler] of Object.entries(options.methods)) {
      // BullMQ forbids ':' in queue names — use '--' to match DistributedService.
      const queueName = `${this.name}--${method}`;

      // BullMQ requires a dedicated connection per Worker instance
      const conn = new Redis(options.redisUrl, { maxRetriesPerRequest: null });

      const worker = new BullWorker<JobPayload>(
        queueName,
        async (job: Job<JobPayload>) => {
          this.log('info', 'job_started', { queue: queueName, jobId: job.id });
          try {
            const result = await handler(job.data.parameters, {
              stash: this.stash,
              jobId: job.id ?? '',
            });
            this.log('info', 'job_completed', { queue: queueName, jobId: job.id });
            return result;
          } catch (err) {
            this.log('error', 'job_threw', {
              queue: queueName,
              jobId: job.id,
              error: (err as Error).message,
            });
            throw err; // re-throw so BullMQ records the failure and retries
          }
        },
        {
          connection: conn,
          concurrency: options.concurrency ?? 1,
          autorun: true,
        },
      );

      worker.on('failed', (job, err) => {
        this.log('error', 'job_failed', {
          queue: queueName,
          jobId: job?.id,
          attempts: job?.attemptsMade,
          error: (err as Error).message,
        });
      });

      worker.on('error', (err: Error) => {
        this.log('error', 'worker_error', {
          queue: queueName,
          error: (err as Error).message,
        });
      });

      this.workers.push(worker);
    }

    this.server = this.createHealthServer(options.healthPort ?? 3001);
    this.log('info', 'worker_started', {
      service: this.name,
      methods: Object.keys(options.methods),
      concurrency: options.concurrency ?? 1,
    });
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────

  /**
   * Drain in-flight jobs, then shut down.
   * Call on SIGTERM to ensure Kubernetes drains gracefully.
   */
  async close(): Promise<void> {
    this.log('info', 'worker_draining', {});
    await Promise.all(this.workers.map((w) => w.close()));
    this.redis.disconnect();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    this.log('info', 'worker_closed', {});
  }

  // ── Health server ─────────────────────────────────────────────────────────

  private createHealthServer(port: number): http.Server {
    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '/';

      if (url === '/health' || url === '/healthz') {
        try {
          await this.redis.ping();
          const running = this.workers.filter((w) => w.isRunning()).length;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'healthy',
              workers_running: running,
              total_workers: this.workers.length,
            }),
          );
        } catch {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'unhealthy', reason: 'redis_unreachable' }));
        }
      } else if (url === '/ready') {
        const allRunning = this.workers.every((w) => w.isRunning());
        res.writeHead(allRunning ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: allRunning ? 'ready' : 'starting' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () =>
      this.log('info', 'health_server_listening', { port }),
    );
    return server;
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
