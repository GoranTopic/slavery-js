import { Worker as BullWorker, QueueEvents, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import http from 'node:http';
import { RedisStash } from './RedisStash.js';
import { RedisQueue, type JobPayload } from './RedisQueue.js';
import { ServiceRegistry, type ServiceEntry } from './ServiceRegistry.js';
import { ServiceBus, type BusMessage, type BusHandler } from './ServiceBus.js';
import { PeerClient } from './PeerClient.js';
import execAsyncCode from '../utils/execAsyncCode.js';
import type { ContainerOrchestrator, ContainerInfo, NodeConfig } from '../cluster/orchestration/ContainerOrchestrator.js';

export interface DistributedServiceOptions {
  /** Logical service name — used as queue namespace */
  serviceName: string;
  /** ioredis-compatible connection string, e.g. redis://redis-service:6379 */
  redisUrl: string;
  /** Names of the methods this service exposes (for registry advertisement) */
  methods?: string[];
  /** HTTP port for /health, /ready, /metrics  (default: 3000) */
  port?: number;
  /** Job result wait timeout in ms (default: 30 000) */
  timeout?: number;
  /** Disable service-discovery (registry + bus). Defaults to true. */
  discovery?: boolean;
  /** Error handling mode — mirrors local Service options */
  onError?: 'throw' | 'log' | 'return' | 'ignore';
  /**
   * Container orchestrator for spawning masters/processes.
   * When provided, this service acts as a primary and can spawn child containers.
   * Pass a K8sOrchestrator or DockerOrchestrator instance.
   */
  orchestrator?: ContainerOrchestrator;
}

export type MasterCallback = (context: MasterContext) => void | Promise<void>;

export interface MasterContext {
  /** The DistributedService instance itself */
  self: DistributedService;
  /** Alias for self */
  service_master: DistributedService;
  /** Dynamic proxy for each discovered peer — keyed by service name */
  [peerName: string]: any;
}

const SYSTEM_METHODS = ['_exec_master', '_queue_size', '_metrics', '_turn_over_ratio', '_exec', '_worker_info'] as const;

/**
 * Distributed replacement for the monolithic Service master.
 *
 * Full feature parity with local Service:
 * - Discovery:    ServiceRegistry + ServiceBus (replaces peerServicesAddresses)
 * - Peer calls:   callService() + getServiceProxy() (replaces ServiceClient)
 * - Job dispatch: BullMQ queues (replaces RequestQueue + NodeManager)
 * - Auto-scale:   DistributedBalancer (replaces ProcessBalancer)
 * - Remote exec:  _exec_master, _exec (replaces exec_master, exec)
 * - Metrics:      _queue_size, _metrics, _turn_over_ratio
 * - Stash:        RedisStash (replaces in-memory Stash)
 */
export class DistributedService {
  private readonly name: string;
  private readonly redis: Redis;
  private readonly redisUrl: string;
  private readonly stash: RedisStash;
  private readonly queues = new Map<string, RedisQueue>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private readonly timeout: number;
  private readonly server: http.Server;
  private readonly startTime = Date.now();
  private readonly onError: string;

  private readonly registry: ServiceRegistry | null;
  private readonly bus: ServiceBus | null;
  private readonly peerClient: PeerClient | null;
  private readonly advertisedMethods: string[];
  private registered = false;

  private readonly orchestrator: ContainerOrchestrator | null;
  private readonly spawnedNodes = new Map<string, ContainerInfo>();

  private readonly systemWorkers: BullWorker[] = [];
  private readonly turnoverTimes: number[] = [];
  private readonly MAX_TURNOVER = 500;

  constructor(options: DistributedServiceOptions) {
    this.name    = options.serviceName;
    this.timeout = options.timeout ?? 30_000;
    this.redisUrl = options.redisUrl;
    this.onError = options.onError ?? 'throw';
    this.advertisedMethods = [
      ...(options.methods ?? []),
      ...SYSTEM_METHODS,
    ];

    this.redis = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    this.stash = new RedisStash(this.redis, this.name);
    this.server = this.createHttpServer(options.port ?? 3000);

    const discovery = options.discovery !== false;
    if (discovery) {
      this.registry   = new ServiceRegistry(this.redis);
      this.bus        = new ServiceBus(this.redis);
      this.peerClient = new PeerClient(this.redis, this.registry, this.name, this.timeout);
    } else {
      this.registry   = null;
      this.bus        = null;
      this.peerClient = null;
    }

    this.orchestrator = options.orchestrator ?? null;

    this.redis.on('error', (err: Error) =>
      this.log('error', 'redis_error', { message: err.message }),
    );
    this.log('info', 'service_started', { service: this.name, discovery, hasOrchestrator: !!this.orchestrator });
  }

  // ── Unified entry point (mirrors local Service.start + masterCallback) ──

  /**
   * Join the cluster, wait for specified peers, build proxy objects,
   * set up system workers, and invoke the master callback.
   *
   * This is the distributed equivalent of Service.start() + masterCallback.
   *
   * @param peerNames  Names of services to wait for before invoking callback
   * @param callback   Receives { self, service_master, ...peerProxies }
   */
  async start(peerNames: string[], callback: MasterCallback): Promise<void> {
    await this.joinCluster();
    this.setupSystemWorkers();

    if (peerNames.length > 0) {
      await this.waitForPeers(peerNames);
    }

    const context = await this.buildMasterContext();
    await callback(context);
  }

  // ── Discovery bootstrap ─────────────────────────────────────────────────

  async joinCluster(): Promise<void> {
    if (!this.registry || !this.bus) return;
    if (this.registered) return;

    await this.registry.register({
      serviceName: this.name,
      methods: this.advertisedMethods,
      heartbeat: new Date().toISOString(),
    });

    await this.bus.subscribe((msg: BusMessage) => {
      this.log('info', 'bus_event', {
        event: msg.event,
        peer: msg.serviceName,
        methods: msg.methods,
      });
    });

    await this.bus.publish('service:joined', this.name, this.advertisedMethods);
    this.registered = true;
    this.log('info', 'cluster_joined', { methods: this.advertisedMethods });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Enqueue a job for own workers (same serviceName). */
  async run<T = unknown>(method: string, parameters: unknown): Promise<T> {
    const queue  = this.getQueue(method);
    const events = await this.getQueueEvents(method);
    const payload: JobPayload = { method, parameters };
    const job = await queue.add(payload);
    const startTime = Date.now();
    this.log('debug', 'job_enqueued', { method, jobId: job.id });
    const result = await job.waitUntilFinished(events, this.timeout) as T;
    this.recordTurnover(startTime);
    return result;
  }

  /** Call a method on a remote peer service (registry lookup → BullMQ). */
  async callService<T = unknown>(serviceName: string, method: string, params: unknown): Promise<T> {
    if (!this.peerClient) {
      throw new Error(
        'Service discovery is disabled. Enable it via { discovery: true } or omit the flag.',
      );
    }
    return this.peerClient.call<T>(serviceName, method, params);
  }

  /**
   * Get a dynamic proxy for a remote service.
   * Methods are generated at call-time from the registry.
   *
   * Usage:
   *   const proxy = svc.getServiceProxy('proxy');
   *   await proxy.getProxy({ country: 'US' });
   *   // equivalent to: svc.callService('proxy', 'getProxy', { country: 'US' })
   */
  getServiceProxy(serviceName: string): any {
    const self = this;
    return new Proxy({}, {
      get(_target, prop: string) {
        if (prop === 'then' || prop === 'toJSON' || typeof prop === 'symbol') return undefined;
        return (params: unknown) => self.callService(serviceName, prop, params);
      },
    });
  }

  /**
   * Build proxy objects for all currently discovered peers.
   * Returns { peerName: proxy, ... }
   */
  async buildPeerProxies(): Promise<Record<string, any>> {
    const peers = await this.listPeers();
    const proxies: Record<string, any> = {};
    for (const peer of peers) {
      if (peer.meta && (peer.meta as any).type === 'worker') continue;
      const proxy = this.getServiceProxy(peer.serviceName);
      proxies[peer.serviceName] = proxy;
      const safeKey = peer.serviceName.replace(/[^a-zA-Z0-9_$]/g, '_');
      if (safeKey !== peer.serviceName) proxies[safeKey] = proxy;
    }
    return proxies;
  }

  /** Execute arbitrary code on this service's master context. */
  async execMaster(code: string): Promise<unknown> {
    const allPeers = await this.listPeers();
    const safeContext: Record<string, any> = {};
    for (const peer of allPeers) {
      if (peer.meta && (peer.meta as any).type === 'worker') continue;
      const safeKey = peer.serviceName.replace(/[^a-zA-Z0-9_$]/g, '_');
      safeContext[safeKey] = this.getServiceProxy(peer.serviceName);
    }
    safeContext.service_master = this;
    safeContext.self = this;
    return execAsyncCode(code, safeContext);
  }

  /** Subscribe to bus events (service:joined, service:left). */
  async onBusEvent(handler: BusHandler): Promise<void> {
    if (!this.bus) return;
    await this.bus.subscribe(handler);
  }

  /** List all registered peer services (excluding self). */
  async listPeers(): Promise<ServiceEntry[]> {
    if (!this.registry) return [];
    return this.registry.getPeers(this.name);
  }

  /** Check if a specific service is currently available. */
  async hasPeer(serviceName: string): Promise<boolean> {
    if (!this.peerClient) return false;
    return this.peerClient.hasPeer(serviceName);
  }

  /** Redis-backed shared stash */
  get sharedStash(): RedisStash {
    return this.stash;
  }

  /** Stash get — mirrors local Service.get() */
  async get(key = ''): Promise<unknown> {
    return this.stash.get(key || '_default');
  }

  /** Stash set — mirrors local Service.set() */
  async set(key: any, value: any = null): Promise<void> {
    return this.stash.set(key, value);
  }

  /** Get queue metrics for this service. */
  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    turnoverRatio: number;
  }> {
    let waiting = 0, active = 0, completed = 0, failed = 0;
    for (const queue of this.queues.values()) {
      waiting   += await queue.waitingCount();
      active    += await queue.activeCount();
      completed += await queue.completedCount();
      failed    += await queue.failedCount();
    }
    return { waiting, active, completed, failed, turnoverRatio: this.getTurnoverRatio() };
  }

  /** Wait until all named peers have registered in the cluster. */
  async waitForPeers(peerNames: string[], timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const peers = await this.listPeers();
      const registered = new Set(peers.map(p => p.serviceName));
      if (peerNames.every(n => registered.has(n))) return;
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`[DistributedService] Timed out waiting for peers: ${peerNames.join(', ')}`);
  }

  get serviceName(): string { return this.name; }

  // ── Container orchestration (primary/master can spawn children) ─────

  /**
   * Spawn a persistent master container (K8s Deployment / Docker container).
   * Only available when an orchestrator is configured.
   *
   * @param config  NodeConfig — at minimum provide image, serviceType, redisUrl
   * @returns       ContainerInfo for the spawned master
   */
  async spawnMaster(config: NodeConfig): Promise<ContainerInfo> {
    this.requireOrchestrator('spawnMaster');
    const cfg: NodeConfig = { ...config, role: 'master' };
    const info = await this.orchestrator!.spawnNode(cfg);
    this.spawnedNodes.set(info.id, info);
    this.log('info', 'master_spawned', { id: info.id, name: info.name, serviceType: cfg.serviceType });
    return info;
  }

  /**
   * Spawn an ephemeral process container (K8s Job / Docker one-shot).
   * The container runs the task and dies when done.
   *
   * @param config  NodeConfig — at minimum provide image, serviceType, redisUrl
   * @returns       ContainerInfo for the spawned process
   */
  async spawnProcess(config: NodeConfig): Promise<ContainerInfo> {
    this.requireOrchestrator('spawnProcess');
    const cfg: NodeConfig = { ...config, role: 'process' };
    const info = await this.orchestrator!.spawnNode(cfg);
    this.spawnedNodes.set(info.id, info);
    this.log('info', 'process_spawned', { id: info.id, name: info.name, serviceType: cfg.serviceType });
    return info;
  }

  /** Remove a previously spawned child container by ID. */
  async removeChild(id: string): Promise<void> {
    this.requireOrchestrator('removeChild');
    await this.orchestrator!.removeNode(id);
    this.spawnedNodes.delete(id);
    this.log('info', 'child_removed', { id });
  }

  /** List all child containers this service has spawned. */
  async listChildren(role?: 'master' | 'process'): Promise<ContainerInfo[]> {
    this.requireOrchestrator('listChildren');
    return this.orchestrator!.listNodes(role);
  }

  /** Scale a master service to exactly `count` replicas. */
  async scaleService(count: number, serviceType?: string): Promise<ContainerInfo[]> {
    this.requireOrchestrator('scaleService');
    return this.orchestrator!.scaleNodes(count, serviceType ?? this.name);
  }

  /** Check if this service has an orchestrator attached. */
  get canOrchestrate(): boolean {
    return this.orchestrator !== null;
  }

  private requireOrchestrator(method: string): void {
    if (!this.orchestrator) {
      throw new Error(
        `[DistributedService] ${method}() requires an orchestrator. ` +
        `Pass a K8sOrchestrator or DockerOrchestrator via the { orchestrator } option.`,
      );
    }
  }

  async close(): Promise<void> {
    this.log('info', 'service_closing', {});

    if (this.registered && this.bus && this.registry) {
      await this.bus.publish('service:left', this.name, this.advertisedMethods);
      await this.registry.deregister(this.name);
    }
    this.registry?.close();
    await this.bus?.close();
    await this.peerClient?.close();

    await Promise.all(this.systemWorkers.map(w => w.close()));

    await Promise.all([
      ...Array.from(this.queues.values()).map((q) => q.close()),
      ...Array.from(this.queueEvents.values()).map((e) => e.close()),
    ]);
    this.redis.disconnect();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    this.log('info', 'service_closed', {});
  }

  // ── System workers (master-side handlers) ─────────────────────────────

  /**
   * Create BullMQ workers for system methods that run on the master
   * (DistributedService), NOT on DistributedWorker instances.
   */
  setupSystemWorkers(): void {
    if (this.systemWorkers.length > 0) return;

    const handlers: Record<string, (params: any) => Promise<unknown>> = {
      _exec_master: async (params: any) => {
        const code = typeof params === 'string' ? params : params?.code;
        if (typeof code !== 'string') throw new Error('_exec_master requires a code string');
        return this.execMaster(code);
      },
      _queue_size: async () => {
        let total = 0;
        for (const queue of this.queues.values()) total += await queue.waitingCount();
        return total;
      },
      _metrics: async () => this.getQueueMetrics(),
      _turn_over_ratio: async () => this.getTurnoverRatio(),
    };

    for (const [method, handler] of Object.entries(handlers)) {
      const queueName = `${this.name}--${method}`;
      const conn = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
      const worker = new BullWorker<JobPayload>(
        queueName,
        async (job: Job<JobPayload>) => handler(job.data.parameters),
        { connection: conn, concurrency: 1, autorun: true },
      );
      this.systemWorkers.push(worker);
    }

    this.log('info', 'system_workers_ready', { methods: Object.keys(handlers) });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async buildMasterContext(): Promise<MasterContext> {
    const peers = await this.buildPeerProxies();
    return { ...peers, self: this, service_master: this };
  }

  private getTurnoverRatio(): number {
    if (this.turnoverTimes.length === 0) return 0;
    const sum = this.turnoverTimes.reduce((a, b) => a + b, 0);
    return sum / this.turnoverTimes.length;
  }

  private recordTurnover(startTime: number): void {
    this.turnoverTimes.push(Date.now() - startTime);
    if (this.turnoverTimes.length > this.MAX_TURNOVER) this.turnoverTimes.shift();
  }

  private getQueue(method: string): RedisQueue {
    const key = `${this.name}--${method}`;
    if (!this.queues.has(key)) {
      this.queues.set(key, new RedisQueue(key, this.redis));
    }
    return this.queues.get(key)!;
  }

  private async getQueueEvents(method: string): Promise<QueueEvents> {
    const key = `${this.name}--${method}`;
    if (!this.queueEvents.has(key)) {
      const conn = new Redis(this.redis.options);
      const ev   = new QueueEvents(key, { connection: conn });
      await ev.waitUntilReady();
      this.queueEvents.set(key, ev);
    }
    return this.queueEvents.get(key)!;
  }

  private createHttpServer(port: number): http.Server {
    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '/';

      if (url === '/health' || url === '/healthz') {
        try {
          await this.redis.ping();
          this.json(res, 200, {
            status: 'healthy',
            uptime_ms: Date.now() - this.startTime,
            peers: this.registry
              ? (await this.registry.getPeers(this.name)).map(p => p.serviceName)
              : [],
          });
        } catch {
          this.json(res, 503, { status: 'unhealthy', reason: 'redis_unreachable' });
        }
      } else if (url === '/ready') {
        this.json(res, 200, { status: 'ready' });
      } else if (url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(await this.prometheusMetrics());
      } else {
        this.json(res, 404, { error: 'not_found' });
      }
    });

    server.listen(port, () => this.log('info', 'http_server_listening', { port }));
    return server;
  }

  private async prometheusMetrics(): Promise<string> {
    const uptime = (Date.now() - this.startTime) / 1000;
    const lines: string[] = [
      `# HELP slavery_uptime_seconds Service uptime`,
      `# TYPE slavery_uptime_seconds gauge`,
      `slavery_uptime_seconds{service="${this.name}"} ${uptime}`,
      `# HELP slavery_queue_waiting Jobs waiting in queue`,
      `# TYPE slavery_queue_waiting gauge`,
      `# HELP slavery_queue_active Jobs currently being processed`,
      `# TYPE slavery_queue_active gauge`,
      `# HELP slavery_queue_completed_total Total completed jobs`,
      `# TYPE slavery_queue_completed_total counter`,
      `# HELP slavery_queue_failed_total Total failed jobs`,
      `# TYPE slavery_queue_failed_total counter`,
    ];

    for (const [key, queue] of this.queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.waitingCount(),
        queue.activeCount(),
        queue.completedCount(),
        queue.failedCount(),
      ]);
      lines.push(
        `slavery_queue_waiting{queue="${key}"} ${waiting}`,
        `slavery_queue_active{queue="${key}"} ${active}`,
        `slavery_queue_completed_total{queue="${key}"} ${completed}`,
        `slavery_queue_failed_total{queue="${key}"} ${failed}`,
      );
    }
    return lines.join('\n') + '\n';
  }

  private json(res: http.ServerResponse, status: number, body: object): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private log(level: string, event: string, extra: object): void {
    console.log(JSON.stringify({
      level, event, service: this.name, ts: new Date().toISOString(), ...extra,
    }));
  }
}
