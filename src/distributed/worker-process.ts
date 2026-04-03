/**
 * Standalone worker entry point.
 * Built by tsup into dist/distributed/worker-process.js — used as Docker CMD.
 *
 * Env vars (all optional, shown with defaults):
 *   SERVICE_NAME=slavery-example
 *   REDIS_URL=redis://localhost:6379
 *   WORKER_CONCURRENCY=2
 *   HEALTH_PORT=3001
 */
import { DistributedWorker } from './DistributedWorker.js';
import type { SlaveMethods } from './DistributedWorker.js';

const methods: SlaveMethods = {
  compute: async (parameters, { stash, jobId }) => {
    const { input } = parameters as { input: number };
    await new Promise((r) => setTimeout(r, 100));
    const result = input * 2;
    await stash.set('last_result', result);
    console.log(JSON.stringify({ level: 'debug', event: 'compute_done', jobId, result }));
    return result;
  },
};

const worker = new DistributedWorker({
  serviceName: process.env['SERVICE_NAME']                ?? 'slavery-example',
  redisUrl:    process.env['REDIS_URL']                   ?? 'redis://localhost:6379',
  concurrency: parseInt(process.env['WORKER_CONCURRENCY'] ?? '2'),
  healthPort:  parseInt(process.env['HEALTH_PORT']        ?? '3001'),
  methods,
});

const shutdown = async (signal: string) => {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_signal', signal }));
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
