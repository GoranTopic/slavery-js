/**
 * Cluster k8s — test de orquestación real.
 *
 * Requiere: Docker Desktop con Kubernetes habilitado.
 *
 * Flujo que prueba:
 *   1. primary (este proceso) crea masters via spawnMaster() → Deployments en k8s
 *   2. primary crea processes via spawnProcess() → Jobs en k8s
 *   3. Verifica que los recursos existen realmente en el cluster
 *   4. Escala un master
 *   5. Limpia todos los recursos
 *
 * Los YAMLs se generan dinámicamente desde la config del Cluster.
 * No hay archivos YAML estáticos — slavery los construye y aplica.
 *
 * Run: npx tsx test/cluster/cluster_k8s.test.ts
 */
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import Cluster from '../../src/cluster/index.js';
import { ensureK8s, ensureNamespace, cleanupK8sResources, sleep } from '../helpers/infra.js';

const file       = process.argv[1]!.split('/').pop();
const NS         = 'slavery-test';
const SVC_NAME   = `test-svc-${Date.now()}`;

// ── Verificar infraestructura ────────────────────────────────────────────────
ensureK8s();
ensureNamespace(NS);

// ── Cluster en modo k8s (el primary) ─────────────────────────────────────────
const cluster = new Cluster({
    mode: 'k8s',
    node: {
        // redis:7-alpine como imagen de prueba — disponible públicamente,
        // no necesita código custom para verificar que k8s crea el recurso.
        image:       'redis:7-alpine',
        serviceName: SVC_NAME,
        redisUrl:    'redis://redis:6379', // no se usa en este test, solo se pasa
        namespace:   NS,
        healthPort:  6379,
    },
    services: {
        proxy:   { image: 'redis:7-alpine' },
        users:   { image: 'redis:7-alpine' },
        scripts: { image: 'redis:7-alpine' },
    },
});

function kubectlGet(kind: string, label: string): string[] {
    const r = spawnSync('kubectl', [
        'get', kind,
        '-l', label,
        '-n', NS,
        '-o', 'jsonpath={.items[*].metadata.name}',
    ], { encoding: 'utf8' });
    const out = r.stdout.trim();
    return out ? out.split(' ') : [];
}

async function run() {
    console.log(`[${file}] cluster: docker-desktop  namespace: ${NS}  service: ${SVC_NAME}`);

    try {
        // ── 1. primary lanza un master → Deployment en k8s ───────────────────
        const masters = await cluster.spawnMaster('proxy', {}, 1);
        expect(masters).to.be.an('array').with.length(1);
        expect(masters[0]!.role).to.equal('master');
        console.log(`[${file}] ✅ spawnMaster('proxy') → Deployment "${masters[0]!.name}"`);

        // Verifica que el Deployment existe realmente en k8s
        await sleep(1000);
        const deployments = kubectlGet('deployment', `slavery-js.service=${SVC_NAME}`);
        expect(deployments.length).to.be.greaterThanOrEqual(1);
        console.log(`[${file}] ✅ Deployment confirmado en k8s: ${deployments.join(', ')}`);

        // ── 2. primary lanza otro master (servicio diferente, imagen distinta) ─
        const usersMasters = await cluster.spawnMaster('users', {}, 1);
        expect(usersMasters[0]!.role).to.equal('master');
        console.log(`[${file}] ✅ spawnMaster('users') → Deployment "${usersMasters[0]!.name}"`);

        // ── 3. primary lanza un process → Job en k8s ─────────────────────────
        const proc = await cluster.spawnProcess('scripts');
        expect(proc.role).to.equal('process');
        console.log(`[${file}] ✅ spawnProcess('scripts') → Job "${proc.name}"`);

        // Verifica que el Job existe en k8s
        await sleep(1000);
        const jobs = kubectlGet('job', `slavery-js.service=${SVC_NAME}`);
        expect(jobs.length).to.be.greaterThanOrEqual(1);
        console.log(`[${file}] ✅ Job confirmado en k8s: ${jobs.join(', ')}`);

        // ── 4. listNodes() ve masters y processes ─────────────────────────────
        await sleep(500);
        const allNodes  = await cluster.listNodes();
        const masterNodes  = await cluster.listNodes('master');
        const processNodes = await cluster.listNodes('process');

        expect(allNodes.length).to.be.greaterThanOrEqual(3);   // 2 masters + 1 process
        expect(masterNodes.every(n => n.role === 'master')).to.be.true;
        expect(processNodes.every(n => n.role === 'process')).to.be.true;
        console.log(`[${file}] ✅ listNodes(): ${masterNodes.length} masters, ${processNodes.length} processes`);

        // ── 5. scaleNodes() escala el master 'proxy' a 2 réplicas ─────────────
        await cluster.scaleNodes(2, SVC_NAME);
        console.log(`[${file}] ✅ scaleNodes(2) ejecutado`);

        // Verifica réplicas en k8s
        await sleep(1000);
        const scaleCheck = spawnSync('kubectl', [
            'get', 'deployment',
            '-l', `slavery-js.service=${SVC_NAME},slavery-js.role=master`,
            '-n', NS,
            '-o', 'jsonpath={.items[0].spec.replicas}',
        ], { encoding: 'utf8' });
        const replicas = parseInt(scaleCheck.stdout.trim() || '0');
        expect(replicas).to.equal(2);
        console.log(`[${file}] ✅ réplicas en k8s confirmadas: ${replicas}`);

        // ── 6. generateManifest() genera YAML dinámico coherente ─────────────
        const masterYaml  = cluster.generateManifest('proxy',   'master');
        const processYaml = cluster.generateManifest('scripts', 'process');

        expect(masterYaml).to.include('kind: Deployment');
        expect(masterYaml).to.include(`namespace: ${NS}`);
        expect(processYaml).to.include('kind: Job');
        expect(processYaml).to.include('ttlSecondsAfterFinished: 60');
        console.log(`[${file}] ✅ generateManifest() produce YAML correcto por role`);

        // ── 7. removeNode() elimina recursos ─────────────────────────────────
        for (const node of allNodes) {
            await cluster.removeNode(node.id);
        }
        await sleep(2000);
        const afterRemove = await cluster.listNodes();
        expect(afterRemove.length).to.equal(0);
        console.log(`[${file}] ✅ removeNode() eliminó todos los recursos`);

    } finally {
        // Limpieza garantizada aunque fallen los asserts
        cleanupK8sResources(NS, SVC_NAME);
        await cluster.close().catch(() => {});
    }

    console.log(`\n[${file}] ✅ todos los tests de k8s pasaron`);
    process.exit(0);
}

run().catch(err => {
    console.error(`[${file}] ❌`, err.message ?? err);
    cleanupK8sResources(NS, SVC_NAME);
    cluster.close().catch(() => {});
    process.exit(1);
});
