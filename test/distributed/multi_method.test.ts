/**
 * Multi-method routing test.
 * Verifies that a single DistributedWorker with several methods routes each
 * job to the correct handler — equivalent to testing multiple slaveMethods.
 *
 * Also verifies that two services with different names have isolated stashes
 * (no key bleed between namespaces).
 *
 * Run: REDIS_URL=redis://localhost:6379 tsx test/distributed/multi_method.test.ts
 */
import { expect } from 'chai';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const SVC_A     = `test-mm-a-${Date.now()}`;
const SVC_B     = `test-mm-b-${Date.now()}`;

// ── Service A — maths ─────────────────────────────────────────────────────────
const methodsA: SlaveMethods = {
    add:      async ({ a, b }: { a: number; b: number }) => a + b,
    multiply: async ({ a, b }: { a: number; b: number }) => a * b,
    reverse:  async ({ s }: { s: string }) => s.split('').reverse().join(''),
};

// ── Service B — unrelated namespace ──────────────────────────────────────────
const methodsB: SlaveMethods = {
    echo:  async ({ msg }: { msg: string }) => msg,
    upper: async ({ msg }: { msg: string }) => msg.toUpperCase(),
};

const workerA  = new DistributedWorker({ serviceName: SVC_A, redisUrl: REDIS_URL, methods: methodsA, healthPort: 0 as any });
const serviceA = new DistributedService({ serviceName: SVC_A, redisUrl: REDIS_URL, port: 0 as any });

const workerB  = new DistributedWorker({ serviceName: SVC_B, redisUrl: REDIS_URL, methods: methodsB, healthPort: 0 as any });
const serviceB = new DistributedService({ serviceName: SVC_B, redisUrl: REDIS_URL, port: 0 as any });

async function cleanup() {
    await Promise.all([workerA.close(), workerB.close(), serviceA.close(), serviceB.close()]);
}

async function run() {
    console.log('[multi_method.test] starting');
    await new Promise(r => setTimeout(r, 800));

    // ── Test 1: each method on Service A routes correctly ─────────────────────
    const sum  = await serviceA.run<number>('add',      { a: 3,  b: 4 });
    const prod = await serviceA.run<number>('multiply', { a: 3,  b: 4 });
    const rev  = await serviceA.run<string>('reverse',  { s: 'hello' });

    expect(sum).to.equal(7);
    expect(prod).to.equal(12);
    expect(rev).to.equal('olleh');
    console.log('[multi_method.test] ✅ Service A: add / multiply / reverse route correctly');

    // ── Test 2: concurrent calls across different methods ─────────────────────
    const [r1, r2, r3] = await Promise.all([
        serviceA.run<number>('add',      { a: 10, b: 5 }),
        serviceA.run<number>('multiply', { a: 10, b: 5 }),
        serviceA.run<string>('reverse',  { s: 'world' }),
    ]);
    expect(r1).to.equal(15);
    expect(r2).to.equal(50);
    expect(r3).to.equal('dlrow');
    console.log('[multi_method.test] ✅ concurrent multi-method calls all correct');

    // ── Test 3: Service B works independently ─────────────────────────────────
    const echo  = await serviceB.run<string>('echo',  { msg: 'hello' });
    const upper = await serviceB.run<string>('upper', { msg: 'hello' });
    expect(echo).to.equal('hello');
    expect(upper).to.equal('HELLO');
    console.log('[multi_method.test] ✅ Service B: echo / upper route correctly');

    // ── Test 4: stash namespace isolation — A and B don't bleed ───────────────
    await serviceA.sharedStash.set('shared_key', 'value-from-A');
    await serviceB.sharedStash.set('shared_key', 'value-from-B');

    const fromA = await serviceA.sharedStash.get('shared_key');
    const fromB = await serviceB.sharedStash.get('shared_key');

    expect(fromA).to.equal('value-from-A');
    expect(fromB).to.equal('value-from-B');
    // They must be different — same key, different namespaces
    expect(fromA).to.not.equal(fromB);
    console.log('[multi_method.test] ✅ stash namespaces are isolated between services');

    await cleanup();
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all multi-method tests passed`);
    process.exit(0);
}

run().catch(async (err) => {
    console.error('[multi_method.test] ❌', err);
    await cleanup().catch(() => {});
    process.exit(1);
});
