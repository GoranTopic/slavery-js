/**
 * Standalone worker entry point.
 *
 * Copy and customise this file for your application.
 * The Dockerfile.worker CMD points to dist/distributed/worker-process.js.
 *
 * Env vars (all optional, shown with defaults):
 *   SERVICE_NAME=slavery-example
 *   REDIS_URL=redis://localhost:6379
 *   WORKER_CONCURRENCY=2
 *   HEALTH_PORT=3001
 */
import { DistributedWorker } from './DistributedWorker.js';
import type { SlaveMethods } from './DistributedWorker.js';

// ── Slave method implementations ──────────────────────────────────────────────
//
// These are the exact same functions you'd pass to Service({ slaveMethods: ... })
// in the monolithic version.  The only difference: context.stash is Redis-backed.
//
const methods: SlaveMethods = {
  compute: async (parameters, { stash, jobId }) => {
    const { input } = parameters as { input: number };

    // Simulate CPU or I/O work
    await new Promise((r) => setTimeout(r, 100));
    const result = input * 2;

    // Shared state — readable by any pod (API or other workers)
    await stash.set('last_result', result);
    console.log(JSON.stringify({ level: 'debug', event: 'compute_done', jobId, result }));
    return result;
  },

  // Add more slave methods here:
  // process:  async (params, ctx) => { ... },
  // analyze:  async (params, ctx) => { ... },
};

// ── Start worker ──────────────────────────────────────────────────────────────
const worker = new DistributedWorker({
  serviceName: process.env['SERVICE_NAME']        ?? 'slavery-example',
  redisUrl:    process.env['REDIS_URL']           ?? 'redis://localhost:6379',
  concurrency: parseInt(process.env['WORKER_CONCURRENCY'] ?? '2'),
  healthPort:  parseInt(process.env['HEALTH_PORT']        ?? '3001'),
  methods,
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_signal', signal }));
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
