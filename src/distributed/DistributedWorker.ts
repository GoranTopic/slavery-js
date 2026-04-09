import { Worker as BullWorker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import http from 'node:http';
import { RedisStash } from './RedisStash.js';
import { ServiceRegistry, type ServiceEntry } from './ServiceRegistry.js';
import type { JobPayload } from './RedisQueue.js';
import execAsyncCode from '../utils/execAsyncCode.js';

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
  /** Enable _exec method for remote code execution (default: false) */
  enableExec?: boolean;
  /** Register this worker in the service registry (default: true if redisUrl provided) */
  registerWorker?: boolean;
}

/**
 * Distributed replacement for Node/NodeManager (worker side).
 *
 * Each instance subscribes to BullMQ queues for every slave method and
 * processes jobs as they arrive.
 *
 * Built-in system methods (auto-registered):
 *   _exec         — Execute arbitrary code (if enableExec is true)
 *   _worker_info  — Return worker ID, status, uptime, methods
 */
export class DistributedWorker {
  private readonly workers: BullWorker[] = [];
  private readonly redis: Redis;
  private readonly stash: RedisStash;
  private readonly server: http.Server;
  private readonly name: string;
  private readonly workerId: string;
  private readonly startTime = Date.now();
  private readonly methodNames: string[];
  private readonly registry: ServiceRegistry | null;
  private jobsProcessed = 0;
  private jobsFailed = 0;

  constructor(options: DistributedWorkerOptions) {
    this.name = options.serviceName;
    this.workerId = `${this.name}-worker-${process.pid}-${Date.now()}`;
    this.methodNames = Object.keys(options.methods);

    this.redis = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    this.stash = new RedisStash(this.redis, this.name);

    this.registry = (options.registerWorker !== false)
      ? new ServiceRegistry(this.redis)
      : null;

    const allMethods: SlaveMethods = { ...options.methods };

    allMethods['_worker_info'] = async () => ({
      workerId: this.workerId,
      service: this.name,
      pid: process.pid,
      uptime_ms: Date.now() - this.startTime,
      methods: this.methodNames,
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
    });

    if (options.enableExec === true) {
      allMethods['_exec'] = async (params: any, { stash }) => {
        const code = typeof params === 'string' ? params : params?.code;
        if (typeof code !== 'string') throw new Error('_exec requires a code string');
        return execAsyncCode(code, { stash });
      };
    }

    for (const [method, handler] of Object.entries(allMethods)) {
      const queueName = `${this.name}--${method}`;
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
            this.jobsProcessed++;
            this.log('info', 'job_completed', { queue: queueName, jobId: job.id });
            return result;
          } catch (err) {
            this.jobsFailed++;
            this.log('error', 'job_threw', {
              queue: queueName,
              jobId: job.id,
              error: (err as Error).message,
            });
            throw err;
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
      workerId: this.workerId,
      methods: this.methodNames,
      concurrency: options.concurrency ?? 1,
    });
  }

  /** Register this worker in the service registry for worker listing. */
  async registerInCluster(): Promise<void> {
    if (!this.registry) return;
    await this.registry.register({
      serviceName: this.workerId,
      methods: this.methodNames,
      heartbeat: new Date().toISOString(),
      meta: {
        type: 'worker',
        parentService: this.name,
        pid: process.pid,
      },
    });
    this.log('info', 'worker_registered', { workerId: this.workerId });
  }

  /** Get worker stats. */
  getStats() {
    return {
      workerId: this.workerId,
      service: this.name,
      uptime_ms: Date.now() - this.startTime,
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
      workersRunning: this.workers.filter(w => w.isRunning()).length,
      totalWorkers: this.workers.length,
    };
  }

  async close(): Promise<void> {
    this.log('info', 'worker_draining', {});
    if (this.registry) {
      await this.registry.deregister(this.workerId).catch(() => {});
      this.registry.close();
    }
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
              workerId: this.workerId,
              workers_running: running,
              total_workers: this.workers.length,
              jobsProcessed: this.jobsProcessed,
              jobsFailed: this.jobsFailed,
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
