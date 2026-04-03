/**
 * Timeout test — DistributedService must reject after the configured timeout
 * when a worker never completes the job.
 *
 * Run: REDIS_URL=redis://localhost:6379 tsx test/distributed/timeout.test.ts
 */
import { expect } from 'chai';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const SERVICE   = `test-timeout-${Date.now()}`;

const methods: SlaveMethods = {
    // takes 10 seconds — longer than the 2s timeout we configure
    slow: async () => {
        await new Promise(r => setTimeout(r, 10_000));
        return 'done';
    },
    // completes immediately — baseline check
    fast: async () => 'fast',
};

const worker  = new DistributedWorker({ serviceName: SERVICE, redisUrl: REDIS_URL, methods, healthPort: 0 as any });
const service = new DistributedService({ serviceName: SERVICE, redisUrl: REDIS_URL, port: 0 as any, timeout: 2_000 });

async function cleanup() {
    await worker.close();
    await service.close();
}

async function run() {
    console.log('[timeout.test] starting');

    // Give BullMQ a moment to subscribe
    await new Promise(r => setTimeout(r, 800));

    // ── Sanity: fast job works ─────────────────────────────────────────────────
    const result = await service.run<string>('fast', {});
    expect(result).to.equal('fast');
    console.log('[timeout.test] ✅ fast job completes normally');

    // ── Slow job must reject within ~timeout ms ────────────────────────────────
    const start = Date.now();
    try {
        await service.run('slow', {});
        expect.fail('should have timed out');
    } catch (err) {
        const elapsed = Date.now() - start;
        // Should throw before the 10s worker finishes
        expect(elapsed).to.be.lessThan(5_000, `took ${elapsed}ms — too long`);
        // BullMQ waitUntilFinished rejects with a timeout error
        expect((err as Error).message.toLowerCase()).to.match(/timeout|timed out|missing/);
        console.log(`[timeout.test] ✅ job timed out after ${elapsed}ms`);
    }

    await cleanup();
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all timeout tests passed`);
    process.exit(0);
}

run().catch(async (err) => {
    console.error('[timeout.test] ❌', err);
    await cleanup().catch(() => {});
    process.exit(1);
});
