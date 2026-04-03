/**
 * Retry test — BullMQ retries a failing job up to the configured attempts.
 * The worker tracks attempt count in the Redis stash; we verify the job
 * eventually succeeds on the 3rd attempt.
 *
 * Run: REDIS_URL=redis://localhost:6379 tsx test/distributed/retry.test.ts
 */
import { expect } from 'chai';
import Redis from 'ioredis';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import { RedisStash } from '../../src/distributed/RedisStash.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const SERVICE   = `test-retry-${Date.now()}`;

// Track attempts via Redis so the worker (different context) and the
// test assertion (service context) can share state.
const trackingClient = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const tracker        = new RedisStash(trackingClient, `${SERVICE}-tracking`);

const methods: SlaveMethods = {
    flakey: async (_params, { stash }) => {
        // Read and increment attempt counter from shared stash
        const prev = (await stash.get('attempts') as number | null) ?? 0;
        const attempt = prev + 1;
        await stash.set('attempts', attempt);

        if (attempt < 3) {
            throw new Error(`simulated failure on attempt ${attempt}`);
        }
        return `succeeded on attempt ${attempt}`;
    },
};

// attempts: 3, no backoff delay so the test runs fast
const worker  = new DistributedWorker({ serviceName: SERVICE, redisUrl: REDIS_URL, methods, healthPort: 0 as any });
const service = new DistributedService({ serviceName: SERVICE, redisUrl: REDIS_URL, port: 0 as any, timeout: 15_000 });

async function cleanup() {
    await worker.close();
    await service.close();
    trackingClient.disconnect();
}

async function run() {
    console.log('[retry.test] starting');
    await new Promise(r => setTimeout(r, 800));

    const result = await service.run<string>('flakey', {});

    // Job should have succeeded on the 3rd attempt
    expect(result).to.equal('succeeded on attempt 3');
    console.log('[retry.test] ✅ job succeeded after retries:', result);

    // Confirm the stash was written 3 times (1 per attempt)
    const attempts = await service.sharedStash.get('attempts');
    expect(attempts).to.equal(3);
    console.log('[retry.test] ✅ stash records 3 attempts');

    await cleanup();
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all retry tests passed`);
    process.exit(0);
}

run().catch(async (err) => {
    console.error('[retry.test] ❌', err);
    await cleanup().catch(() => {});
    process.exit(1);
});
