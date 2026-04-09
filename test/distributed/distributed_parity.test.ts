/**
 * Distributed mode — full parity with local Service.
 *
 * Validates all 6 features:
 *   1. Dynamic proxy   — proxy.getProxy(params) instead of callService()
 *   2. Master callback — start(peers, cb) wires everything automatically
 *   3. Remote exec     — _exec on worker, _exec_master on service
 *   4. Queue metrics   — _queue_size, _metrics, _turn_over_ratio
 *   5. Auto-scaling    — DistributedBalancer monitors and scales
 *   6. Worker info     — _worker_info returns worker stats
 *
 * Run: npx tsx test/distributed/distributed_parity.test.ts
 */
import { expect } from 'chai';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import { DistributedBalancer } from '../../src/distributed/DistributedBalancer.js';
import type { SlaveMethods, SlaveMethod } from '../../src/distributed/DistributedWorker.js';
import { ensureRedis, sleep } from '../helpers/infra.js';

const file = process.argv[1]!.split('/').pop();

const proxyMethods: SlaveMethods = {
  getProxy: (async ({ country }: any) =>
    ({ ip: '1.2.3.4', port: 8080, country })) as SlaveMethod,
  listProxies: (async () =>
    [{ ip: '1.2.3.4' }, { ip: '5.6.7.8' }]) as SlaveMethod,
};

const usersMethods: SlaveMethods = {
  getUser: (async ({ id }: any) =>
    ({ id, name: `User-${id}` })) as SlaveMethod,
  assignProxy: (async ({ userId, proxy }: any) =>
    ({ userId, proxy, assigned: true })) as SlaveMethod,
};

async function run() {
  const { url: REDIS, teardown } = await ensureRedis();
  const suffix = Date.now();
  console.log(`[${file}] redis: ${REDIS}`);

  const proxySvc = new DistributedService({
    serviceName: `proxy-${suffix}`,
    redisUrl: REDIS,
    methods: ['getProxy', 'listProxies'],
    port: 0 as any,
    discovery: true,
  });

  const usersSvc = new DistributedService({
    serviceName: `users-${suffix}`,
    redisUrl: REDIS,
    methods: ['getUser', 'assignProxy'],
    port: 0 as any,
    discovery: true,
  });

  const proxyWorker = new DistributedWorker({
    serviceName: `proxy-${suffix}`,
    redisUrl: REDIS,
    methods: proxyMethods,
    healthPort: 0 as any,
    enableExec: true,
  });

  const usersWorker = new DistributedWorker({
    serviceName: `users-${suffix}`,
    redisUrl: REDIS,
    methods: usersMethods,
    healthPort: 0 as any,
    enableExec: true,
  });

  const allToClose: { close(): Promise<void> }[] = [proxySvc, usersSvc, proxyWorker, usersWorker];
  let balancer: DistributedBalancer | undefined;

  async function cleanup() {
    balancer?.stop();
    for (const c of allToClose) {
      await c.close().catch(() => {});
    }
    teardown();
  }

  try {
    await sleep(500);

    // Setup: join cluster and start system workers
    await proxySvc.joinCluster();
    proxySvc.setupSystemWorkers();
    await usersSvc.joinCluster();
    usersSvc.setupSystemWorkers();
    await sleep(300);

    // ── 1. Dynamic proxy ────────────────────────────────────────────────
    const proxyClient = usersSvc.getServiceProxy(`proxy-${suffix}`);
    const result = await proxyClient.getProxy({ country: 'MX' });
    expect(result.ip).to.equal('1.2.3.4');
    expect(result.country).to.equal('MX');

    const list = await proxyClient.listProxies({});
    expect(list).to.be.an('array').with.length(2);
    console.log(`[${file}] 1. dynamic proxy OK`);

    // ── 2. Master callback (start pattern) ──────────────────────────────
    let callbackInvoked = false;
    let receivedPeers: string[] = [];

    const cbSvc = new DistributedService({
      serviceName: `callback-${suffix}`,
      redisUrl: REDIS,
      methods: [],
      port: 0 as any,
      discovery: true,
    });
    allToClose.push(cbSvc);

    await cbSvc.start([`proxy-${suffix}`, `users-${suffix}`], async (ctx) => {
      callbackInvoked = true;
      expect(ctx.self).to.equal(cbSvc);
      expect(ctx.service_master).to.equal(cbSvc);

      const proxyProxy = ctx[`proxy-${suffix}`];
      expect(proxyProxy).to.not.be.undefined;

      const p = await proxyProxy.getProxy({ country: 'AR' });
      expect(p.country).to.equal('AR');

      receivedPeers = Object.keys(ctx).filter(k => k !== 'self' && k !== 'service_master');
    });

    expect(callbackInvoked).to.be.true;
    expect(receivedPeers).to.include(`proxy-${suffix}`);
    expect(receivedPeers).to.include(`users-${suffix}`);
    console.log(`[${file}] 2. master callback start() OK`);

    // ── 3. Remote exec on worker (_exec) ────────────────────────────────
    const execResult = await usersSvc.callService(
      `proxy-${suffix}`, '_exec',
      { code: 'async ({ stash }) => { await stash.set("exec_test", 42); return "done"; }' },
    );
    expect(execResult).to.equal('done');

    const stashVal = await proxySvc.sharedStash.get('exec_test');
    expect(stashVal).to.equal(42);
    console.log(`[${file}] 3. _exec on worker OK`);

    // ── 4. Remote exec on master (_exec_master) ─────────────────────────
    const execMasterResult = await usersSvc.callService(
      `proxy-${suffix}`, '_exec_master',
      { code: 'async ({ self }) => { return self.serviceName; }' },
    );
    expect(execMasterResult).to.equal(`proxy-${suffix}`);
    console.log(`[${file}] 4. _exec_master on service OK`);

    // ── 5. Queue metrics (_queue_size, _metrics, _turn_over_ratio) ─────
    // Run some jobs first so metrics have data
    await proxySvc.run('getProxy', { country: 'US' });
    await proxySvc.run('getProxy', { country: 'UK' });

    const queueSize = await usersSvc.callService(`proxy-${suffix}`, '_queue_size', {});
    expect(queueSize).to.be.a('number');

    const metrics = await usersSvc.callService(`proxy-${suffix}`, '_metrics', {});
    expect(metrics).to.have.property('waiting');
    expect(metrics).to.have.property('active');
    expect(metrics).to.have.property('completed');
    expect(metrics).to.have.property('failed');
    expect(metrics).to.have.property('turnoverRatio');

    const turnover = await usersSvc.callService(`proxy-${suffix}`, '_turn_over_ratio', {});
    expect(turnover).to.be.a('number');
    console.log(`[${file}] 5. queue metrics OK (turnover: ${(turnover as number).toFixed(1)}ms)`);

    // ── 6. Worker info (_worker_info) ───────────────────────────────────
    const workerInfo = await proxySvc.callService(
      `proxy-${suffix}`, '_worker_info', {},
    );
    expect(workerInfo).to.have.property('workerId');
    expect(workerInfo).to.have.property('service', `proxy-${suffix}`);
    expect(workerInfo).to.have.property('methods');
    expect(workerInfo).to.have.property('jobsProcessed');
    expect((workerInfo as any).jobsProcessed).to.be.greaterThan(0);
    console.log(`[${file}] 6. _worker_info OK (id: ${(workerInfo as any).workerId})`);

    // ── 7. Local getQueueMetrics() ──────────────────────────────────────
    const localMetrics = await proxySvc.getQueueMetrics();
    expect(localMetrics.turnoverRatio).to.be.greaterThan(0);
    console.log(`[${file}] 7. local getQueueMetrics() OK`);

    // ── 8. Stash get/set (mirrors local Service.get/set) ────────────────
    await proxySvc.set('config', { maxRetries: 3 });
    const config = await proxySvc.get('config');
    expect(config).to.deep.equal({ maxRetries: 3 });
    console.log(`[${file}] 8. stash get/set OK`);

    // ── 9. DistributedBalancer (scale-up) ─────────────────────────────
    let scaleUpCalled = 0;
    let scaleDownCalled = 0;

    balancer = new DistributedBalancer({
      checkQueueSize: async () => 10,
      checkWorkers: async () => ({ activeJobs: 5, totalWorkers: 5 }),
      addWorker: async () => { scaleUpCalled++; },
      removeWorker: async () => { scaleDownCalled++; },
      queueScaleUpThreshold: 3,
      cpuThreshold: 100,
      memThreshold: 100,
      checkInterval: 60_000,
    });
    balancer.stop();

    // First call: prevQueueSize=0 → queueSize=10 → growth=10 → scale up
    await balancer.evaluate();
    // Second call: prevQueueSize=10 → queueSize=10 → growth=0 → no action
    await balancer.evaluate();
    expect(scaleUpCalled).to.equal(1);
    expect(scaleDownCalled).to.equal(0);
    console.log(`[${file}] 9. DistributedBalancer scale-up OK`);

    // ── 10. DistributedBalancer (scale-down) ────────────────────────────
    let scaleDown2 = 0;
    const balancer2 = new DistributedBalancer({
      checkQueueSize: async () => 0,
      checkWorkers: async () => ({ activeJobs: 0, totalWorkers: 5 }),
      addWorker: async () => {},
      removeWorker: async () => { scaleDown2++; },
      queueScaleDownThreshold: 0,
      minIdleRate: 0.1,
      checkInterval: 60_000,
      minWorkers: 1,
    });
    balancer2.stop();

    // First evaluate sets prevQueueSize=0, queueGrowth=0, idle=5, idleRate=1.0>0.1 → scale down
    await balancer2.evaluate();
    expect(scaleDown2).to.equal(1);
    console.log(`[${file}] 10. DistributedBalancer scale-down OK`);

    // ── 10. waitForPeers timeout ────────────────────────────────────────
    let timedOut = false;
    try {
      await proxySvc.waitForPeers(['nonexistent-service'], 500);
    } catch (err) {
      expect((err as Error).message).to.include('Timed out');
      timedOut = true;
    }
    expect(timedOut).to.be.true;
    console.log(`[${file}] 11. waitForPeers timeout OK`);

  } finally {
    await cleanup();
  }

  console.log(`\n[${file}] All distributed parity tests passed`);
  process.exit(0);
}

run().catch(err => {
  console.error(`[${file}] FAILED:`, err);
  process.exit(1);
});
