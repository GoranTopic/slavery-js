/**
 * End-to-end test: DistributedService ↔ Redis ↔ DistributedWorker.
 *
 * Mirrors the slaves.test.ts concurrency pattern:
 *   9 jobs dispatched in parallel, each takes N seconds,
 *   total wall-clock time must be < 12s (not 45s sequential).
 *
 * Requires Redis at REDIS_URL (default: redis://localhost:6379).
 * Run:  REDIS_URL=redis://localhost:6379 tsx test/distributed/worker_service.test.ts
 */
import { expect } from 'chai';
import { performance } from 'perf_hooks';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';

const REDIS_URL   = process.env['REDIS_URL']   ?? 'redis://localhost:6379';
const SERVICE     = `test-svc-${Date.now()}`;

// ── Slave method definitions (exactly like slaveMethods in the monolithic API) ─
const methods: SlaveMethods = {

    // waits N seconds and returns a tagged string
    wait: async ({ seconds }: { seconds: number }) => {
        await new Promise(r => setTimeout(r, seconds * 1000));
        if (seconds > 7) return `waited ${seconds}s 😡`;
        if (seconds > 5) return `waited ${seconds}s 😐`;
        if (seconds > 2) return `waited ${seconds}s 😃`;
        return `waited ${seconds}s 😄`;
    },

    // computes and writes result to shared stash
    compute: async ({ input }: { input: number }, { stash }) => {
        const result = input * input;
        await stash.set('last_compute', result);
        return result;
    },

    // always throws — used to test error propagation
    alwaysThrows: async () => {
        throw new Error('intentional worker error');
    },
};

// ── Spin up service + worker ─────────────────────────────────────────────────
const worker  = new DistributedWorker({ serviceName: SERVICE, redisUrl: REDIS_URL, methods, concurrency: 9, healthPort: 0 as any });
const service = new DistributedService({ serviceName: SERVICE, redisUrl: REDIS_URL, port: 0 as any });

async function cleanup() {
    await worker.close();
    await service.close();
}

async function run() {
    console.log(`[worker_service.test] redis: ${REDIS_URL}  service: ${SERVICE}`);

    // Give BullMQ workers a moment to connect to Redis and subscribe
    await new Promise(r => setTimeout(r, 800));

    // ── Test 1: basic round-trip ───────────────────────────────────────────────
    const r1 = await service.run<string>('wait', { seconds: 1 });
    expect(r1).to.equal('waited 1s 😄');
    console.log('[worker_service.test] ✅ basic round-trip');

    // ── Test 2: concurrent jobs (concurrency proof) ────────────────────────────
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const start = performance.now();
    const results = await Promise.all(
        counts.map(n => service.run<string>('wait', { seconds: n }))
    );
    const elapsed = (performance.now() - start) / 1000;

    results.forEach((res, i) => {
        const n = counts[i]!;
        const expected = n > 7 ? `waited ${n}s 😡`
                       : n > 5 ? `waited ${n}s 😐`
                       : n > 2 ? `waited ${n}s 😃`
                       :         `waited ${n}s 😄`;
        expect(res).to.equal(expected);
    });
    // Sequential would take 45s; concurrent with 9 workers takes ~9s
    expect(elapsed).to.be.lessThan(12, `jobs ran sequentially (took ${elapsed.toFixed(1)}s)`);
    console.log(`[worker_service.test] ✅ 9 concurrent jobs done in ${elapsed.toFixed(2)}s`);

    // ── Test 3: shared stash (written by worker, read by service) ─────────────
    await service.run<number>('compute', { input: 7 });
    const stored = await service.sharedStash.get('last_compute');
    expect(stored).to.equal(49);
    console.log('[worker_service.test] ✅ stash shared between service and worker');

    // ── Test 4: multiple compute results ──────────────────────────────────────
    const computeResults = await Promise.all(
        [2, 3, 4].map(n => service.run<number>('compute', { input: n }))
    );
    expect(computeResults).to.deep.equal([4, 9, 16]);
    console.log('[worker_service.test] ✅ multiple compute jobs returned correct values');

    // ── Test 5: worker error propagates to service ─────────────────────────────
    try {
        await service.run('alwaysThrows', {});
        expect.fail('should have thrown');
    } catch (err) {
        expect((err as Error).message).to.include('intentional worker error');
        console.log('[worker_service.test] ✅ worker error propagates correctly');
    }

    await cleanup();
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all worker/service tests passed`);
    process.exit(0);
}

run().catch(async (err) => {
    console.error('[worker_service.test] ❌', err);
    await cleanup().catch(() => {});
    process.exit(1);
});
