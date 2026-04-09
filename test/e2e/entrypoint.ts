/**
 * Container entrypoint for E2E tests.
 *
 * Reads environment variables injected by the K8sOrchestrator and starts
 * a DistributedService (master) + DistributedWorker with service-type
 * specific methods.  The image is the same for all services — behaviour
 * is driven entirely by SERVICE_TYPE.
 */
import { DistributedService } from '../../src/distributed/DistributedService.js';
import { DistributedWorker }  from '../../src/distributed/DistributedWorker.js';
import type { SlaveMethods }  from '../../src/distributed/DistributedWorker.js';

const SERVICE_TYPE = process.env['SERVICE_TYPE'] || process.env['SERVICE_NAME'] || 'generic';
const REDIS_URL    = process.env['REDIS_URL']    || 'redis://redis:6379';
const HEALTH_PORT  = parseInt(process.env['HEALTH_PORT'] || '3001', 10);

const methodsByType: Record<string, SlaveMethods> = {
  proxy: {
    getProxy:    async (params: any) => ({ ip: '10.0.0.1', port: 8080, country: params?.country || 'US' }),
    listProxies: async ()            => [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }],
  },
  users: {
    getUser: async (params: any) => ({
      id:     params?.id ?? 0,
      name:   `User-${params?.id ?? 0}`,
      source: 'k8s-pod',
    }),
  },
};

const methods: SlaveMethods = methodsByType[SERVICE_TYPE] ?? {
  echo: async (params: any) => params,
  ping: async ()            => 'pong',
};

const svc = new DistributedService({
  serviceName: SERVICE_TYPE,
  redisUrl:    REDIS_URL,
  methods:     Object.keys(methods),
  port:        HEALTH_PORT,
  discovery:   true,
});

const worker = new DistributedWorker({
  serviceName: SERVICE_TYPE,
  redisUrl:    REDIS_URL,
  methods,
  healthPort:  HEALTH_PORT + 1,
  enableExec:  true,
});

await svc.joinCluster();
svc.setupSystemWorkers();

console.log(JSON.stringify({
  level: 'info',
  event: 'e2e_service_ready',
  service: SERVICE_TYPE,
  port: HEALTH_PORT,
  methods: Object.keys(methods),
}));

process.on('SIGTERM', async () => {
  console.log(`[entrypoint] SIGTERM — shutting down ${SERVICE_TYPE}`);
  await worker.close();
  await svc.close();
  process.exit(0);
});
