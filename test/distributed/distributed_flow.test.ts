/**
 * DistributedService + DistributedWorker — flujo completo.
 *
 * Levanta Redis automáticamente via Docker si no hay uno disponible.
 * Requiere: Docker Desktop corriendo.
 *
 * Lo que prueba:
 *   - primary encola trabajo → master lo procesa (round-trip)
 *   - concurrencia: N jobs en paralelo
 *   - stash compartido entre primary y master
 *   - error del master llega al primary
 *   - múltiples métodos en el mismo worker
 *
 * Run: npx tsx test/distributed/distributed_flow.test.ts
 */
import { expect } from 'chai';
import { performance } from 'perf_hooks';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods } from '../../src/distributed/DistributedWorker.js';
import { ensureRedis } from '../helpers/infra.js';

const file     = process.argv[1]!.split('/').pop();
const SVC_NAME = `test-flow-${Date.now()}`;

const methods: SlaveMethods = {
    echo: async ({ msg }: { msg: string }) => `echo:${msg}`,

    saveForProcess: async ({ key, value }: { key: string; value: unknown }, { stash }) => {
        await stash.set(key, value);
        return { saved: true };
    },

    sleep: async ({ ms }: { ms: number }) => {
        await new Promise(r => setTimeout(r, ms));
        return ms;
    },

    fail: async () => { throw new Error('intentional failure'); },
};

async function run() {
    const { url: REDIS, teardown } = await ensureRedis();
    console.log(`[${file}] redis: ${REDIS}  service: ${SVC_NAME}`);

    const service = new DistributedService({ serviceName: SVC_NAME, redisUrl: REDIS, port: 0 as any });
    const worker  = new DistributedWorker({ serviceName: SVC_NAME, redisUrl: REDIS, methods, concurrency: 5, healthPort: 0 as any });

    async function cleanup() {
        await worker.close();
        await service.close();
        teardown();
    }

    try {
        await new Promise(r => setTimeout(r, 800));

        // ── 1. Round-trip básico (primary → master → resultado) ───────────────
        const echo = await service.run<string>('echo', { msg: 'hello' });
        expect(echo).to.equal('echo:hello');
        console.log(`[${file}] ✅ round-trip básico`);

        // ── 2. Concurrencia — master procesa en paralelo ──────────────────────
        const delays  = [100, 200, 300, 400, 500];
        const start   = performance.now();
        const results = await Promise.all(delays.map(ms => service.run<number>('sleep', { ms })));
        const elapsed = performance.now() - start;

        expect(results).to.deep.equal(delays);
        // Secuencial = 1500ms, paralelo con 5 workers = ~500ms
        expect(elapsed).to.be.lessThan(900, `corrió secuencialmente (${elapsed.toFixed(0)}ms)`);
        console.log(`[${file}] ✅ ${delays.length} jobs concurrentes en ${elapsed.toFixed(0)}ms`);

        // ── 3. Stash compartido entre primary y master ────────────────────────
        await service.run('saveForProcess', { key: 'report_001', value: { url: 's3://bucket/r.pdf' } });
        const stored = await service.sharedStash.get('report_001') as { url: string };
        expect(stored.url).to.equal('s3://bucket/r.pdf');
        console.log(`[${file}] ✅ stash compartido primary ↔ master`);

        // ── 4. Error del master llega al primary ──────────────────────────────
        let threw = false;
        try { await service.run('fail', {}); } catch (err) {
            expect((err as Error).message).to.include('intentional failure');
            threw = true;
        }
        expect(threw).to.be.true;
        console.log(`[${file}] ✅ error del master propagado al primary`);

        // ── 5. Múltiples métodos en el mismo worker ───────────────────────────
        const [e1, e2, s1] = await Promise.all([
            service.run<string>('echo',  { msg: 'a' }),
            service.run<string>('echo',  { msg: 'b' }),
            service.run<number>('sleep', { ms: 50 }),
        ]);
        expect(e1).to.equal('echo:a');
        expect(e2).to.equal('echo:b');
        expect(s1).to.equal(50);
        console.log(`[${file}] ✅ múltiples métodos rutean correctamente en paralelo`);

    } finally {
        await cleanup();
    }

    console.log(`\n[${file}] ✅ todos los tests de flujo distribuido pasaron`);
    process.exit(0);
}

run().catch(err => {
    console.error(`[${file}] ❌`, err);
    process.exit(1);
});
