/**
 * Standalone API-service entry point.
 *
 * Copy and customise this file for your application.
 * The Dockerfile.api CMD points to dist/distributed/api-server.js.
 *
 * Env vars (all optional, shown with defaults):
 *   SERVICE_NAME=slavery-example
 *   REDIS_URL=redis://localhost:6379
 *   PORT=3000
 *   TIMEOUT_MS=30000
 */
import { DistributedService } from './DistributedService.js';

const service = new DistributedService({
  serviceName: process.env['SERVICE_NAME'] ?? 'slavery-example',
  redisUrl:    process.env['REDIS_URL']    ?? 'redis://localhost:6379',
  port:        parseInt(process.env['PORT']       ?? '3000'),
  timeout:     parseInt(process.env['TIMEOUT_MS'] ?? '30000'),
});

// ── Your master-callback logic goes here ─────────────────────────────────────
//
// This is the equivalent of the existing mastercallback that receives service
// client proxies.  Replace the example interval with your actual orchestration.
//
const interval = setInterval(async () => {
  try {
    const result = await service.run<number>('compute', { input: Math.random() });
    console.log(JSON.stringify({ level: 'info', event: 'job_result', result }));
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'job_error', error: (err as Error).message }));
  }
}, 5_000);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_signal', signal }));
  clearInterval(interval);
  await service.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
