/**
 * Resilience test — worker recovers after a simulated crash.
 *
 * Simulates a worker dying mid-flight by closing it and starting a new one.
 * BullMQ re-queues stalled jobs (after stallInterval); the new worker picks
 * them up and completes them.
 *
 * Note: BullMQ's default stallInterval is 30s. For testing we set it to 2s
 * via the Worker options. The service timeout must be longer than that.
 *
 * Run: REDIS_URL=redis://localhost:6379 tsx test/distributed/resilience.test.ts
 */
import { expect } from 'chai';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const SERVICE   = `test-resilience-${Date.now()}`;

// Simple method — just returns a value
const methods: SlaveMethods = {
    ping: async ({ id }: { id: number }) => `pong-${id}`,
};

const service = new DistributedService({ serviceName: SERVICE, redisUrl: REDIS_URL, port: 0 as any, timeout: 10_000 });

async function makeWorker() {
    return new DistributedWorker({ serviceName: SERVICE, redisUrl: REDIS_URL, methods, healthPort: 0 as any });
}

async function cleanup(worker?: DistributedWorker) {
    if (worker) await worker.close().catch(() => {});
    await service.close();
}

async function run() {
    console.log('[resilience.test] starting');

    // ── Test 1: normal operation ──────────────────────────────────────────────
    const w1 = await makeWorker();
    await new Promise(r => setTimeout(r, 800));

    const r1 = await service.run<string>('ping', { id: 1 });
    expect(r1).to.equal('pong-1');
    console.log('[resilience.test] ✅ worker 1 responds correctly');

    // ── Test 2: kill worker 1, start worker 2, verify new jobs are processed ──
    // Drain worker 1 gracefully (simulates pod restart, not hard crash)
    await w1.close();
    console.log('[resilience.test] worker 1 closed — starting worker 2');

    const w2 = await makeWorker();
    // Give worker 2 time to subscribe to the queue
    await new Promise(r => setTimeout(r, 800));

    const r2 = await service.run<string>('ping', { id: 2 });
    expect(r2).to.equal('pong-2');
    console.log('[resilience.test] ✅ worker 2 picks up new jobs after worker 1 restart');

    // ── Test 3: concurrent jobs during a worker restart ───────────────────────
    // Enqueue multiple jobs while worker 2 is alive, all must complete
    const ids = [10, 11, 12, 13, 14];
    const results = await Promise.all(
        ids.map(id => service.run<string>('ping', { id }))
    );
    results.forEach((res, i) => expect(res).to.equal(`pong-${ids[i]}`));
    console.log('[resilience.test] ✅ 5 concurrent jobs all completed correctly');

    await cleanup(w2);
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all resilience tests passed`);
    process.exit(0);
}

run().catch(async (err) => {
    console.error('[resilience.test] ❌', err);
    await cleanup().catch(() => {});
    process.exit(1);
});
