/**
 * End-to-End Kubernetes test — full distributed flow with real pods.
 *
 * Validates the complete lifecycle:
 *   1. Build Docker image from project source (dynamic — same image, behaviour by env)
 *   2. Deploy Redis inside K8s (NodePort for test access)
 *   3. Spawn proxy + users masters via Cluster (K8sOrchestrator generates YAML dynamically)
 *   4. Wait for pods to pass readiness probes
 *   5. Verify service discovery: both services register in the Redis registry
 *   6. Call proxy.getProxy() from test machine through shared Redis
 *   7. Call users.getUser() from test machine
 *   8. Cross-pod communication: _exec_master on proxy calls users.getUser()
 *   9. Spawn ephemeral process Job — verify it completes and pod terminates
 *  10. Verify generated YAML manifests are valid
 *  11. Clean up all resources
 *
 * Requires: Docker Desktop with Kubernetes enabled.
 *
 * Run: npx tsx test/e2e/e2e_k8s.test.ts
 */
import { expect } from 'chai';
import { spawnSync, spawn, type ChildProcess } from 'child_process';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { ServiceRegistry } from '../../src/distributed/ServiceRegistry.js';
import { Redis } from 'ioredis';
import Cluster from '../../src/cluster/index.js';
import { ensureK8s, ensureNamespace, sleep } from '../helpers/infra.js';

const file     = process.argv[1]!.split('/').pop();
const NS       = 'slavery-e2e';
const SVC_NAME = `e2e-${Date.now()}`;
const IMAGE    = 'slavery-js-e2e:local';
const REDIS_NODEPORT = 30379;

// ── Helpers ──────────────────────────────────────────────────────────────────

function kubectl(...args: string[]): { stdout: string; stderr: string; ok: boolean } {
  const r = spawnSync('kubectl', args, { encoding: 'utf8', timeout: 15_000, stdio: 'pipe' });
  return { stdout: r.stdout?.trim() ?? '', stderr: r.stderr?.trim() ?? '', ok: r.status === 0 };
}

function kubectlPodPhases(label: string): string[] {
  const { stdout } = kubectl('get', 'pod', '-l', label, '-n', NS,
    '-o', 'jsonpath={.items[*].status.phase}');
  return stdout ? stdout.split(' ') : [];
}

function kubectlPodReady(label: string): boolean {
  const { stdout } = kubectl('get', 'pod', '-l', label, '-n', NS,
    '-o', 'jsonpath={.items[*].status.conditions[?(@.type=="Ready")].status}');
  const statuses = stdout ? stdout.split(' ') : [];
  return statuses.length > 0 && statuses.every(s => s === 'True');
}

function buildDockerImage(): void {
  console.log(`[${file}]    building Docker image ${IMAGE}...`);
  const r = spawnSync('docker', [
    'build', '-t', IMAGE,
    '-f', 'test/e2e/Dockerfile',
    '.',
  ], { encoding: 'utf8', timeout: 180_000, stdio: 'pipe', cwd: process.cwd() });
  if (r.status !== 0) {
    throw new Error(`Docker build failed:\n${r.stderr}\n${r.stdout}`);
  }
  console.log(`[${file}]    image ${IMAGE} built OK`);
}

function deployRedis(): void {
  const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: e2e-redis
  namespace: ${NS}
  labels:
    app: e2e-redis
spec:
  containers:
    - name: redis
      image: redis:7-alpine
      ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ${NS}
spec:
  selector:
    app: e2e-redis
  ports:
    - port: 6379
      targetPort: 6379
      nodePort: ${REDIS_NODEPORT}
  type: NodePort
`;
  const r = spawnSync('kubectl', ['apply', '-f', '-'], {
    input: yaml, encoding: 'utf8', timeout: 10_000, stdio: 'pipe',
  });
  if (r.status !== 0) throw new Error(`Redis deploy failed: ${r.stderr}`);
}

async function waitForRedis(url: string, maxWait = 60_000): Promise<void> {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    try {
      const c = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true });
      await c.connect();
      await c.ping();
      c.disconnect();
      return;
    } catch { /* retry */ }
    await sleep(2000);
  }
  throw new Error('Redis in K8s never became reachable');
}

async function waitForPodsReady(label: string, maxWait = 120_000): Promise<void> {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    if (kubectlPodReady(label)) return;
    const phases = kubectlPodPhases(label);
    console.log(`[${file}]    waiting for pods (${label}): ${phases.join(', ') || 'none yet'}`);
    await sleep(5000);
  }
  // Dump pod events for debugging
  const { stdout } = kubectl('describe', 'pods', '-l', label, '-n', NS);
  throw new Error(`Pods never became ready (${label}):\n${stdout.slice(-2000)}`);
}

function cleanupAll(): void {
  kubectl('delete', 'namespace', NS, '--ignore-not-found');
}

// ── Main test ────────────────────────────────────────────────────────────────

async function run() {
  const REDIS_INTERNAL = 'redis://redis:6379';
  const REDIS_EXTERNAL = `redis://localhost:${REDIS_NODEPORT}`;

  console.log(`[${file}] ── E2E Kubernetes Test ──`);
  console.log(`[${file}]    namespace: ${NS}   service: ${SVC_NAME}`);
  console.log(`[${file}]    image: ${IMAGE}`);

  // ── 0. Prerequisites ────────────────────────────────────────────────────
  ensureK8s();
  // Clean up any leftover from previous runs
  kubectl('delete', 'namespace', NS, '--ignore-not-found');
  await sleep(3000);
  ensureNamespace(NS);

  // ── 1. Build Docker image ───────────────────────────────────────────────
  buildDockerImage();

  // ── 2. Deploy Redis in K8s ──────────────────────────────────────────────
  deployRedis();
  console.log(`[${file}]    waiting for Redis pod...`);
  await waitForPodsReady('app=e2e-redis');
  await waitForRedis(REDIS_EXTERNAL);
  console.log(`[${file}] ✅ 1. Redis running in K8s (NodePort ${REDIS_NODEPORT})`);

  // ── 3. Create Cluster with K8s mode ─────────────────────────────────────
  const cluster = new Cluster({
    mode: 'k8s',
    node: {
      image:       IMAGE,
      serviceName: SVC_NAME,
      redisUrl:    REDIS_INTERNAL,
      namespace:   NS,
      healthPort:  3001,
      imagePullPolicy: 'Never',
    },
    services: {
      proxy: {},
      users: {},
      scripts: {
        image:   'busybox:latest',
        command: ['sh', '-c', 'echo e2e-task-done && sleep 2'],
        imagePullPolicy: 'IfNotPresent',
      },
    },
  });

  let testSvc: DistributedService | null = null;

  try {
    // ── 4. Spawn master Deployments (dynamic YAML) ──────────────────────
    const proxyNodes = await cluster.spawnMaster('proxy');
    expect(proxyNodes).to.be.an('array').with.length(1);
    expect(proxyNodes[0]!.role).to.equal('master');
    console.log(`[${file}] ✅ 2. spawnMaster('proxy') → Deployment "${proxyNodes[0]!.name}"`);

    const usersNodes = await cluster.spawnMaster('users');
    expect(usersNodes).to.be.an('array').with.length(1);
    expect(usersNodes[0]!.role).to.equal('master');
    console.log(`[${file}] ✅ 3. spawnMaster('users') → Deployment "${usersNodes[0]!.name}"`);

    // ── 5. Wait for service pods to become ready ────────────────────────
    console.log(`[${file}]    waiting for proxy pod...`);
    await waitForPodsReady(`slavery-js.service=${SVC_NAME},slavery-js.service-type=proxy`);
    console.log(`[${file}]    waiting for users pod...`);
    await waitForPodsReady(`slavery-js.service=${SVC_NAME},slavery-js.service-type=users`);
    console.log(`[${file}] ✅ 4. All service pods are Running & Ready`);

    // ── 6. Verify service discovery via registry ────────────────────────
    const redis = new Redis(REDIS_EXTERNAL, { maxRetriesPerRequest: null });
    const registry = new ServiceRegistry(redis);

    // Give services a moment to register
    let proxyEntry = null, usersEntry = null;
    for (let i = 0; i < 30; i++) {
      proxyEntry = await registry.getService('proxy');
      usersEntry = await registry.getService('users');
      if (proxyEntry && usersEntry) break;
      await sleep(2000);
    }

    expect(proxyEntry).to.not.be.null;
    expect(proxyEntry!.methods).to.include('getProxy');
    expect(proxyEntry!.methods).to.include('listProxies');
    expect(usersEntry).to.not.be.null;
    expect(usersEntry!.methods).to.include('getUser');
    console.log(`[${file}] ✅ 5. Service discovery: proxy (${proxyEntry!.methods.length} methods) + users (${usersEntry!.methods.length} methods)`);

    // ── 7. Call proxy.getProxy() from test machine ──────────────────────
    testSvc = new DistributedService({
      serviceName: `e2etest${Date.now()}`,
      redisUrl:    REDIS_EXTERNAL,
      methods:     [],
      port:        0 as any,
      discovery:   true,
    });
    await testSvc.joinCluster();
    await sleep(500);

    const proxyResult = await testSvc.callService<{ ip: string; port: number; country: string }>(
      'proxy', 'getProxy', { country: 'MX' },
    );
    expect(proxyResult.ip).to.equal('10.0.0.1');
    expect(proxyResult.country).to.equal('MX');
    console.log(`[${file}] ✅ 6. test → proxy.getProxy({ country: 'MX' }) = ${JSON.stringify(proxyResult)}`);

    // ── 8. Call users.getUser() from test machine ───────────────────────
    const userResult = await testSvc.callService<{ id: number; name: string; source: string }>(
      'users', 'getUser', { id: 42 },
    );
    expect(userResult.id).to.equal(42);
    expect(userResult.name).to.equal('User-42');
    expect(userResult.source).to.equal('k8s-pod');
    console.log(`[${file}] ✅ 7. test → users.getUser({ id: 42 }) = ${JSON.stringify(userResult)}`);

    // ── 9. Cross-pod communication: proxy calls users via _exec_master ──
    const crossPodResult = await testSvc.callService<{ id: number; name: string }>(
      'proxy', '_exec_master',
      { code: `return await self.callService('users', 'getUser', { id: 99 })` },
    );
    expect(crossPodResult.id).to.equal(99);
    expect(crossPodResult.name).to.equal('User-99');
    console.log(`[${file}] ✅ 8. Cross-pod: proxy._exec_master → users.getUser(99) = ${JSON.stringify(crossPodResult)}`);

    // ── 10. Dynamic proxy pattern ───────────────────────────────────────
    const usersProxy = testSvc.getServiceProxy('users');
    const proxyUser = await usersProxy.getUser({ id: 7 });
    expect(proxyUser.id).to.equal(7);
    console.log(`[${file}] ✅ 9. Dynamic proxy: usersProxy.getUser({ id: 7 }) OK`);

    // ── 11. Queue metrics from pod ──────────────────────────────────────
    const queueSize = await testSvc.callService<number>('proxy', '_queue_size', {});
    expect(queueSize).to.be.a('number');
    console.log(`[${file}] ✅ 10. Remote queue metrics: proxy._queue_size = ${queueSize}`);

    // ── 12. Worker info from pod ────────────────────────────────────────
    const workerInfo = await testSvc.callService<{ workerId: string; service: string }>(
      'proxy', '_worker_info', {},
    );
    expect(workerInfo.service).to.equal('proxy');
    expect(workerInfo.workerId).to.be.a('string');
    console.log(`[${file}] ✅ 11. Worker info: ${workerInfo.workerId}`);

    // ── 13. Spawn ephemeral process Job ─────────────────────────────────
    const proc = await cluster.spawnProcess('scripts');
    expect(proc.role).to.equal('process');
    console.log(`[${file}] ✅ 12. spawnProcess('scripts') → Job "${proc.name}"`);

    let processPhases: string[] = [];
    for (let i = 0; i < 20; i++) {
      await sleep(3000);
      processPhases = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.role=process`);
      if (processPhases.length > 0 && processPhases.every(p => p === 'Succeeded')) break;
    }
    expect(processPhases.every(p => p === 'Succeeded')).to.be.true;
    console.log(`[${file}] ✅ 13. Process Job completed — pod Succeeded`);

    // ── 14. Masters still alive after process died ──────────────────────
    const proxyPhases = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.service-type=proxy`);
    const usersPhases = kubectlPodPhases(`slavery-js.service=${SVC_NAME},slavery-js.service-type=users`);
    expect(proxyPhases.some(p => p === 'Running')).to.be.true;
    expect(usersPhases.some(p => p === 'Running')).to.be.true;
    console.log(`[${file}] ✅ 14. Masters still alive: proxy=${proxyPhases}, users=${usersPhases}`);

    // ── 15. Verify dynamic YAML manifest generation ─────────────────────
    const proxyYaml  = cluster.generateManifest('proxy',   'master');
    const usersYaml  = cluster.generateManifest('users',   'master');
    const scriptYaml = cluster.generateManifest('scripts', 'process');

    expect(proxyYaml).to.include('kind: Deployment');
    expect(proxyYaml).to.include(`image: ${IMAGE}`);
    expect(proxyYaml).to.include('imagePullPolicy: Never');
    expect(proxyYaml).to.include('slavery-js.service-type: "proxy"');
    expect(usersYaml).to.include('slavery-js.service-type: "users"');
    expect(scriptYaml).to.include('kind: Job');
    expect(scriptYaml).to.include('image: busybox:latest');
    console.log(`[${file}] ✅ 15. Dynamic YAML manifests generated correctly`);

    // ── 16. Scale proxy to 2 replicas ───────────────────────────────────
    await cluster.scaleNodes(2, SVC_NAME);
    await sleep(5000);
    const { stdout: replicaStr } = kubectl(
      'get', 'deployment', '-l', `slavery-js.service=${SVC_NAME},slavery-js.service-type=proxy`,
      '-n', NS, '-o', 'jsonpath={.items[0].spec.replicas}',
    );
    expect(parseInt(replicaStr || '0')).to.equal(2);
    console.log(`[${file}] ✅ 16. Scale proxy to 2 replicas confirmed`);

    // ── 17. listNodes sees the full hierarchy ───────────────────────────
    const allNodes    = await cluster.listNodes();
    const masterNodes = await cluster.listNodes('master');
    const procNodes   = await cluster.listNodes('process');
    expect(masterNodes.length).to.equal(2);
    expect(procNodes.length).to.be.greaterThanOrEqual(1);
    console.log(`[${file}] ✅ 17. listNodes: ${masterNodes.length} masters, ${procNodes.length} processes, ${allNodes.length} total`);

    registry.close();
    redis.disconnect();

  } finally {
    if (testSvc) await testSvc.close().catch(() => {});
    await cluster.close().catch(() => {});
    cleanupAll();
  }

  console.log(`\n[${file}] ✅ All E2E Kubernetes tests passed!`);
  process.exit(0);
}

run().catch(err => {
  console.error(`[${file}] ❌ E2E FAILED:`, err.message ?? err);
  cleanupAll();
  process.exit(1);
});
