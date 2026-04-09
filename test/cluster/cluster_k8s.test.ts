/**
 * Cluster k8s — test de orquestación real con la jerarquía completa.
 *
 * Requiere: Docker Desktop con Kubernetes habilitado.
 *
 * Flujo:
 *   1. Despliega el PRIMARY (slavery) como Deployment perpetuo
 *   2. El primary crea MASTERS (proxy, users) como Deployments perpetuos
 *   3. Los masters crean PROCESSES (scripts) como Jobs efímeros
 *   4. Verifica que primary y masters siguen vivos
 *   5. Verifica que los processes terminan y sus pods mueren
 *   6. Escala masters
 *   7. Genera manifiestos dinámicos
 *   8. Limpia todos los recursos
 *
 * Run: npx tsx test/cluster/cluster_k8s.test.ts
 */
import { expect } from 'chai';
import { spawnSync } from 'child_process';
import Cluster from '../../src/cluster/index.js';
import { ensureK8s, ensureNamespace, cleanupK8sResources, sleep } from '../helpers/infra.js';

const file     = process.argv[1]!.split('/').pop();
const NS       = 'slavery-test';
const SVC_NAME = `test-svc-${Date.now()}`;

ensureK8s();
ensureNamespace(NS);

const cluster = new Cluster({
    mode: 'k8s',
    node: {
        image:       'redis:7-alpine',
        serviceName: SVC_NAME,
        redisUrl:    'redis://redis:6379',
        namespace:   NS,
        healthPort:  6379,
    },
    services: {
        proxy:   { image: 'redis:7-alpine' },
        users:   { image: 'redis:7-alpine' },
        scripts: { image: 'busybox:latest', command: ['sh', '-c', 'echo task-done && sleep 2'] },
    },
});

function kubectlGet(kind: string, label: string): string[] {
    const r = spawnSync('kubectl', [
        'get', kind, '-l', label, '-n', NS,
        '-o', 'jsonpath={.items[*].metadata.name}',
    ], { encoding: 'utf8' });
    const out = r.stdout.trim();
    return out ? out.split(' ') : [];
}

function kubectlPodPhases(label: string): string[] {
    const r = spawnSync('kubectl', [
        'get', 'pod', '-l', label, '-n', NS,
        '-o', 'jsonpath={.items[*].status.phase}',
    ], { encoding: 'utf8' });
    const out = r.stdout.trim();
    return out ? out.split(' ') : [];
}

async function run() {
    console.log(`[${file}] cluster: docker-desktop  namespace: ${NS}  service: ${SVC_NAME}`);

    try {
        // ── 1. PRIMARY: desplegar slavery como Deployment perpetuo ───────────
        const primary = await cluster.spawnPrimary();
        expect(primary.role).to.equal('primary');
        console.log(`[${file}] ✅ spawnPrimary() → Deployment "${primary.name}"`);

        await sleep(2000);
        const primaryDeps = kubectlGet('deployment', `slavery-js.service=${SVC_NAME},slavery-js.role=primary`);
        expect(primaryDeps.length).to.equal(1);
        console.log(`[${file}] ✅ primary Deployment confirmado en k8s: ${primaryDeps[0]}`);

        // ── 2. MASTERS: primary crea masters perpetuos ──────────────────────
        const proxyMasters = await cluster.spawnMaster('proxy', {}, 1);
        expect(proxyMasters).to.be.an('array').with.length(1);
        expect(proxyMasters[0]!.role).to.equal('master');
        console.log(`[${file}] ✅ spawnMaster('proxy') → Deployment "${proxyMasters[0]!.name}"`);

        const usersMasters = await cluster.spawnMaster('users', {}, 1);
        expect(usersMasters[0]!.role).to.equal('master');
        console.log(`[${file}] ✅ spawnMaster('users') → Deployment "${usersMasters[0]!.name}"`);

        await sleep(2000);
        const masterDeps = kubectlGet('deployment', `slavery-js.service=${SVC_NAME},slavery-js.role=master`);
        expect(masterDeps.length).to.equal(2);
        console.log(`[${file}] ✅ 2 master Deployments confirmados: ${masterDeps.join(', ')}`);

        // ── 3. PROCESSES: crear Jobs efímeros que ejecutan y mueren ──────────
        const proc1 = await cluster.spawnProcess('scripts');
        expect(proc1.role).to.equal('process');
        console.log(`[${file}] ✅ spawnProcess('scripts') → Job "${proc1.name}"`);

        const proc2 = await cluster.spawnProcess('scripts');
        expect(proc2.role).to.equal('process');
        console.log(`[${file}] ✅ spawnProcess('scripts') → Job "${proc2.name}"`);

        // ── 4. Verificar que processes terminan (pods mueren) ───────────────
        console.log(`[${file}]    esperando a que los processes terminen...`);
        let processPhases: string[] = [];
        for (let i = 0; i < 15; i++) {
            await sleep(2000);
            processPhases = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.role=process`);
            const allDone = processPhases.length > 0 && processPhases.every(p => p === 'Succeeded');
            if (allDone) break;
        }
        expect(processPhases.every(p => p === 'Succeeded')).to.be.true;
        console.log(`[${file}] ✅ processes terminaron: ${processPhases.length} pods en estado Succeeded`);

        // ── 5. Verificar que primary y masters siguen VIVOS ─────────────────
        const primaryPods = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.role=primary`);
        expect(primaryPods.some(p => p === 'Running')).to.be.true;
        console.log(`[${file}] ✅ primary sigue vivo (pods Running)`);

        const masterPods = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.role=master`);
        expect(masterPods.some(p => p === 'Running')).to.be.true;
        console.log(`[${file}] ✅ masters siguen vivos (${masterPods.filter(p => p === 'Running').length} pods Running)`);

        // ── 6. listNodes() ve la jerarquía completa ─────────────────────────
        const allNodes     = await cluster.listNodes();
        const primaryNodes = await cluster.listNodes('primary');
        const masterNodes  = await cluster.listNodes('master');
        const processNodes = await cluster.listNodes('process');

        expect(primaryNodes.length).to.equal(1);
        expect(masterNodes.length).to.equal(2);
        expect(processNodes.length).to.equal(2);
        expect(allNodes.length).to.be.greaterThanOrEqual(5);
        console.log(`[${file}] ✅ listNodes(): ${primaryNodes.length} primary, ${masterNodes.length} masters, ${processNodes.length} processes`);

        // ── 7. scaleNodes() escala masters de proxy a 2 réplicas ────────────
        await cluster.scaleNodes(2, SVC_NAME);
        await sleep(1000);
        const scaleCheck = spawnSync('kubectl', [
            'get', 'deployment',
            '-l', `slavery-js.service=${SVC_NAME},slavery-js.role=master`,
            '-n', NS, '-o', 'jsonpath={.items[0].spec.replicas}',
        ], { encoding: 'utf8' });
        const replicas = parseInt(scaleCheck.stdout.trim() || '0');
        expect(replicas).to.equal(2);
        console.log(`[${file}] ✅ scaleNodes(2): réplicas confirmadas = ${replicas}`);

        // ── 8. generateManifest() produce YAML por role ─────────────────────
        const primaryYaml = cluster.generateManifest('primary', 'primary');
        const masterYaml  = cluster.generateManifest('proxy',   'master');
        const processYaml = cluster.generateManifest('scripts', 'process');

        expect(primaryYaml).to.include('kind: Deployment');
        expect(primaryYaml).to.include('slavery-js.role: primary');
        expect(masterYaml).to.include('kind: Deployment');
        expect(masterYaml).to.include('slavery-js.role: master');
        expect(processYaml).to.include('kind: Job');
        expect(processYaml).to.include('ttlSecondsAfterFinished: 60');
        console.log(`[${file}] ✅ generateManifest() produce YAML correcto por role`);

        // ── 9. removeNode() limpia todo ─────────────────────────────────────
        for (const node of allNodes) {
            await cluster.removeNode(node.id);
        }
        await sleep(2000);
        const afterRemove = await cluster.listNodes();
        expect(afterRemove.length).to.equal(0);
        console.log(`[${file}] ✅ removeNode() eliminó todos los recursos`);

    } finally {
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
