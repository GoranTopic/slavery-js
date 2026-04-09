/**
 * Service Discovery & Inter-Service Communication tests.
 *
 * Validates:
 *   1. Dos servicios se registran y se descubren mutuamente
 *   2. Un servicio llama métodos de otro servicio via callService()
 *   3. Un tercer servicio se une más tarde y es descubierto dinámicamente
 *   4. Bus pub/sub notifica joined/left en tiempo real
 *   5. Servicio que se va es removido del registry
 *   6. callService falla si el servicio no existe en el registry
 *   7. callService falla si el método no existe en el servicio remoto
 *
 * Run: npx tsx test/distributed/discovery_and_peers.test.ts
 */
import { expect } from 'chai';
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker } from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods, SlaveMethod } from '../../src/distributed/DistributedWorker.js';
import type { BusMessage } from '../../src/distributed/ServiceBus.js';
import { ensureRedis, sleep } from '../helpers/infra.js';

const file = process.argv[1]!.split('/').pop();

const proxyMethods: SlaveMethods = {
  getProxy: (async ({ country }: { country: string }) =>
    ({ ip: '1.2.3.4', port: 8080, country })) as SlaveMethod,
  listProxies: (async () =>
    [{ ip: '1.2.3.4' }, { ip: '5.6.7.8' }]) as SlaveMethod,
};

const usersMethods: SlaveMethods = {
  getUser: (async ({ id }: { id: number }) =>
    ({ id, name: `User-${id}`, proxy: null })) as SlaveMethod,
  assignProxy: (async ({ userId, proxy }: { userId: number; proxy: object }) =>
    ({ userId, proxy, assigned: true })) as SlaveMethod,
};

const scriptsMethods: SlaveMethods = {
  runScript: (async ({ script }: { script: string }) =>
    ({ script, result: 'ok', ts: Date.now() })) as SlaveMethod,
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
  });

  const usersWorker = new DistributedWorker({
    serviceName: `users-${suffix}`,
    redisUrl: REDIS,
    methods: usersMethods,
    healthPort: 0 as any,
  });

  const allToClose: { close(): Promise<void> }[] = [proxySvc, usersSvc, proxyWorker, usersWorker];

  async function cleanup() {
    for (const c of allToClose) {
      await c.close().catch(() => {});
    }
    teardown();
  }

  try {
    await sleep(500);

    // ── Join cluster ────────────────────────────────────────────────────
    const busEvents: BusMessage[] = [];
    await proxySvc.onBusEvent(msg => busEvents.push(msg));
    await usersSvc.onBusEvent(msg => busEvents.push(msg));

    await proxySvc.joinCluster();
    await usersSvc.joinCluster();
    await sleep(300);

    // ── 1. Mutual discovery ─────────────────────────────────────────────
    const proxyPeers = await proxySvc.listPeers();
    const usersPeers = await usersSvc.listPeers();
    expect(proxyPeers.some(p => p.serviceName === `users-${suffix}`)).to.be.true;
    expect(usersPeers.some(p => p.serviceName === `proxy-${suffix}`)).to.be.true;
    console.log(`[${file}] 1. mutual discovery OK`);

    // ── 2. Inter-service call: users pide proxy a proxy service ─────────
    const proxy = await usersSvc.callService<{ ip: string; port: number; country: string }>(
      `proxy-${suffix}`, 'getProxy', { country: 'US' },
    );
    expect(proxy.ip).to.equal('1.2.3.4');
    expect(proxy.country).to.equal('US');
    console.log(`[${file}] 2. users -> proxy.getProxy() OK`);

    // proxy llama a users
    const user = await proxySvc.callService<{ id: number; name: string }>(
      `users-${suffix}`, 'getUser', { id: 42 },
    );
    expect(user.id).to.equal(42);
    expect(user.name).to.equal('User-42');
    console.log(`[${file}] 3. proxy -> users.getUser() OK`);

    // ── 3. Tercer servicio se une dinámicamente ─────────────────────────
    const scriptsSvc = new DistributedService({
      serviceName: `scripts-${suffix}`,
      redisUrl: REDIS,
      methods: ['runScript'],
      port: 0 as any,
      discovery: true,
    });
    const scriptsWorker = new DistributedWorker({
      serviceName: `scripts-${suffix}`,
      redisUrl: REDIS,
      methods: scriptsMethods,
      healthPort: 0 as any,
    });
    allToClose.push(scriptsSvc, scriptsWorker);

    await scriptsSvc.joinCluster();
    await sleep(500);

    const peersAfter = await proxySvc.listPeers();
    expect(peersAfter.some(p => p.serviceName === `scripts-${suffix}`)).to.be.true;
    console.log(`[${file}] 4. dynamic discovery of new service OK`);

    // ── 4. Call al nuevo servicio ────────────────────────────────────────
    const scriptResult = await usersSvc.callService<{ script: string; result: string }>(
      `scripts-${suffix}`, 'runScript', { script: 'hello.sh' },
    );
    expect(scriptResult.result).to.equal('ok');
    console.log(`[${file}] 5. users -> scripts.runScript() OK`);

    // ── 5. Bus events recibidos ─────────────────────────────────────────
    const joinEvents = busEvents.filter(e => e.event === 'service:joined');
    expect(joinEvents.length).to.be.greaterThanOrEqual(3);
    console.log(`[${file}] 6. bus events received (${busEvents.length} total) OK`);

    // ── 6. Servicio que se va desaparece del registry ───────────────────
    await scriptsSvc.close();
    await sleep(200);
    const hasScripts = await proxySvc.hasPeer(`scripts-${suffix}`);
    expect(hasScripts).to.be.false;
    console.log(`[${file}] 7. deregistered service removed OK`);

    // ── 7. callService falla si servicio no existe ──────────────────────
    let threw = false;
    try {
      await usersSvc.callService('nonexistent-svc', 'foo', {});
    } catch (err) {
      expect((err as Error).message).to.include('not found in registry');
      threw = true;
    }
    expect(threw).to.be.true;
    console.log(`[${file}] 8. callService to unknown service throws OK`);

    // ── 8. callService falla si método no existe ────────────────────────
    threw = false;
    try {
      await usersSvc.callService(`proxy-${suffix}`, 'nonExistentMethod', {});
    } catch (err) {
      expect((err as Error).message).to.include('does not expose method');
      threw = true;
    }
    expect(threw).to.be.true;
    console.log(`[${file}] 9. callService to unknown method throws OK`);

  } finally {
    await cleanup();
  }

  console.log(`\n[${file}] All discovery & peer communication tests passed`);
  process.exit(0);
}

run().catch(err => {
  console.error(`[${file}] FAILED:`, err);
  process.exit(1);
});
