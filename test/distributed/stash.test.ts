/**
 * RedisStash integration test.
 * Requires a Redis instance reachable at REDIS_URL (default: redis://localhost:6379).
 * Run:  REDIS_URL=redis://localhost:6379 tsx test/distributed/stash.test.ts
 */
import { expect } from 'chai';
import Redis from 'ioredis';
import { RedisStash } from '../../src/distributed/RedisStash.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const NS = `test:stash:${Date.now()}`;

const client = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const stash  = new RedisStash(client, NS);

async function cleanup() {
    const keys = await client.keys(`${NS}:*`);
    if (keys.length) await client.del(...keys);
    client.disconnect();
}

async function run() {
    console.log(`[stash.test] connecting to ${REDIS_URL}`);

    try { await client.ping(); }
    catch (e) {
        console.error('[stash.test] ❌ Cannot reach Redis — is it running?');
        process.exit(1);
    }

    // ── set / get ──────────────────────────────────────────────────────────────
    await stash.set('counter', 42);
    const v = await stash.get('counter');
    expect(v).to.equal(42);
    console.log('[stash.test] ✅ set/get number');

    // ── default key ─────────────────────────────────────────────────────────────
    await stash.set();                            // set '_default' key
    const def = await stash.get();
    expect(def).to.be.null;                       // value was undefined → JSON.stringify(undefined) → null
    console.log('[stash.test] ✅ default key');

    // ── object value ────────────────────────────────────────────────────────────
    await stash.set('obj', { x: 1, y: [2, 3] });
    const obj = await stash.get('obj') as { x: number; y: number[] };
    expect(obj.x).to.equal(1);
    expect(obj.y).to.deep.equal([2, 3]);
    console.log('[stash.test] ✅ set/get object');

    // ── overwrite ──────────────────────────────────────────────────────────────
    await stash.set('counter', 99);
    const v2 = await stash.get('counter');
    expect(v2).to.equal(99);
    console.log('[stash.test] ✅ overwrite');

    // ── del ────────────────────────────────────────────────────────────────────
    await stash.del('counter');
    const gone = await stash.get('counter');
    expect(gone).to.be.null;
    console.log('[stash.test] ✅ del');

    // ── keys ───────────────────────────────────────────────────────────────────
    await stash.set('a', 1);
    await stash.set('b', 2);
    const keys = await stash.keys();
    expect(keys).to.include('a');
    expect(keys).to.include('b');
    console.log('[stash.test] ✅ keys listing');

    // ── concurrent writes (no race condition) ──────────────────────────────────
    await Promise.all(
        Array.from({ length: 20 }, (_, i) => stash.set(`concurrent_${i}`, i))
    );
    const vals = await Promise.all(
        Array.from({ length: 20 }, (_, i) => stash.get(`concurrent_${i}`))
    );
    vals.forEach((v, i) => expect(v).to.equal(i));
    console.log('[stash.test] ✅ 20 concurrent writes/reads');

    await cleanup();
    console.log(`\n[${process.argv[1]!.split('/').pop()}] ✅ all stash tests passed`);
    process.exit(0);
}

run().catch((err) => {
    console.error('[stash.test] ❌ unexpected error:', err);
    cleanup().finally(() => process.exit(1));
});
