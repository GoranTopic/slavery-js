/**
 * Test infrastructure helpers.
 *
 * ensureRedis()  — levanta Redis via Docker si no hay uno disponible.
 * ensureK8s()    — verifica que el cluster k8s esté disponible, lanza error si no.
 * ensureNamespace() — crea el namespace si no existe.
 */
import { spawnSync } from 'child_process';
import { Redis } from 'ioredis';

const REDIS_CONTAINER = 'slavery-test-redis';
const REDIS_PORT      = 16379;

// ── Redis ─────────────────────────────────────────────────────────────────────

export async function ensureRedis(): Promise<{ url: string; teardown: () => void }> {
    const url = process.env['REDIS_URL'] ?? `redis://localhost:${REDIS_PORT}`;

    if (await canReachRedis(url)) {
        return { url, teardown: () => {} };
    }

    console.log('  [infra] levantando contenedor Redis...');
    spawnSync('docker', ['rm', '-f', REDIS_CONTAINER], { stdio: 'ignore' });

    const result = spawnSync('docker', [
        'run', '-d', '--name', REDIS_CONTAINER,
        '-p', `${REDIS_PORT}:6379`,
        'redis:7-alpine',
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
        throw new Error(`No se pudo iniciar Redis: ${result.stderr}`);
    }

    const redisUrl = `redis://localhost:${REDIS_PORT}`;
    for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (await canReachRedis(redisUrl)) {
            console.log(`  [infra] Redis listo en ${redisUrl}`);
            return {
                url: redisUrl,
                teardown: () => spawnSync('docker', ['rm', '-f', REDIS_CONTAINER], { stdio: 'ignore' }),
            };
        }
    }

    throw new Error('El contenedor Redis arrancó pero no responde');
}

async function canReachRedis(url: string): Promise<boolean> {
    const client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 1000, lazyConnect: true });
    try {
        await client.connect();
        await client.ping();
        return true;
    } catch {
        return false;
    } finally {
        client.disconnect();
    }
}

// ── Kubernetes ────────────────────────────────────────────────────────────────

/**
 * Verifica que haya un cluster k8s disponible.
 * Lanza un error claro si no — los tests requieren k8s, no lo saltan.
 */
export function ensureK8s(): void {
    const result = spawnSync('kubectl', ['cluster-info'], {
        encoding: 'utf8', timeout: 5000, stdio: 'pipe',
    });

    if (result.status !== 0 || !result.stdout.includes('running')) {
        throw new Error(
            'Kubernetes no está disponible.\n' +
            'Habilita Kubernetes en Docker Desktop: Settings → Kubernetes → Enable Kubernetes'
        );
    }
}

/**
 * Crea el namespace si no existe. Retorna el nombre del namespace.
 */
export function ensureNamespace(ns: string): void {
    const exists = spawnSync('kubectl', ['get', 'namespace', ns], { stdio: 'ignore' });
    if (exists.status !== 0) {
        const result = spawnSync('kubectl', ['create', 'namespace', ns], { encoding: 'utf8', stdio: 'pipe' });
        if (result.status !== 0) throw new Error(`No se pudo crear namespace ${ns}: ${result.stderr}`);
        console.log(`  [infra] namespace "${ns}" creado`);
    }
}

/**
 * Elimina todos los recursos del namespace con los labels de slavery.
 */
export function cleanupK8sResources(ns: string, serviceName: string): void {
    const label = `slavery-js.service=${serviceName}`;
    spawnSync('kubectl', ['delete', 'deployment,job,pod', '-l', label, '-n', ns, '--ignore-not-found'], { stdio: 'ignore' });
}

// ── Utilidades ────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}
