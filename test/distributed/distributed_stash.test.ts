/**
 * RedisStash — estado compartido entre primary, master y process.
 *
 * Levanta Redis automáticamente via Docker si no hay uno disponible.
 * Requiere: Docker Desktop corriendo.
 *
 * Run: npx tsx test/distributed/distributed_stash.test.ts
 */
import { expect } from 'chai';
import { Redis } from 'ioredis';
import { RedisStash } from '../../src/distributed/RedisStash.js';
import { ensureRedis } from '../helpers/infra.js';

const file = process.argv[1]!.split('/').pop();

async function run() {
    const { url: REDIS, teardown } = await ensureRedis();
    console.log(`[${file}] redis: ${REDIS}`);

    const NS     = `test-stash-${Date.now()}`;
    const client = new Redis(REDIS, { maxRetriesPerRequest: null });
    const stash  = new RedisStash(client, NS);

    async function cleanup() {
        const keys = await client.keys(`${NS}*`);
        if (keys.length) await client.del(...keys);
        client.disconnect();
        teardown();
    }

    try {
        // ── master guarda resultado, primary lo lee ───────────────────────────
        await stash.set('report_001', { url: 's3://bucket/report.pdf', userId: 'u42' });
        const report = await stash.get('report_001') as { url: string; userId: string };
        expect(report.url).to.equal('s3://bucket/report.pdf');
        expect(report.userId).to.equal('u42');
        console.log(`[${file}] ✅ master escribe, primary lee`);

        // ── process lee lo que guardó el master ───────────────────────────────
        const forProcess = await stash.get('report_001') as { url: string };
        expect(forProcess.url).to.include('s3://');
        console.log(`[${file}] ✅ process lee stash del master`);

        // ── aislamiento de namespace entre servicios ──────────────────────────
        const otherNS    = `${NS}-other`;
        const otherStash = new RedisStash(client, otherNS);
        await stash.set('key', 'value-A');
        await otherStash.set('key', 'value-B');
        expect(await stash.get('key')).to.equal('value-A');
        expect(await otherStash.get('key')).to.equal('value-B');
        const otherKeys = await client.keys(`${otherNS}*`);
        if (otherKeys.length) await client.del(...otherKeys);
        console.log(`[${file}] ✅ aislamiento de namespace entre servicios`);

        // ── del elimina la clave ──────────────────────────────────────────────
        await stash.del('report_001');
        expect(await stash.get('report_001')).to.be.null;
        console.log(`[${file}] ✅ del elimina clave`);

        // ── undefined se guarda como null ─────────────────────────────────────
        await stash.set('empty');
        expect(await stash.get('empty')).to.be.null;
        console.log(`[${file}] ✅ undefined se guarda como null`);

        // ── escrituras concurrentes sin race condition ─────────────────────────
        await Promise.all(
            Array.from({ length: 10 }, (_, i) => stash.set(`job_${i}`, i * 10))
        );
        const vals = await Promise.all(
            Array.from({ length: 10 }, (_, i) => stash.get(`job_${i}`))
        );
        vals.forEach((v, i) => expect(v).to.equal(i * 10));
        console.log(`[${file}] ✅ 10 escrituras concurrentes sin race condition`);

        // ── keys() lista solo este namespace ──────────────────────────────────
        const keys = await stash.keys();
        expect(keys.length).to.be.greaterThan(0);
        expect(keys.every(k => !k.includes(':'))).to.be.true;
        console.log(`[${file}] ✅ keys() retorna solo claves de este namespace`);

    } finally {
        await cleanup();
    }

    console.log(`\n[${file}] ✅ todos los tests de stash pasaron`);
    process.exit(0);
}

run().catch(err => {
    console.error(`[${file}] ❌`, err);
    process.exit(1);
});
