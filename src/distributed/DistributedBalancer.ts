import os from 'os';

export interface DistributedBalancerConfig {
  /** Get total waiting jobs across all queues */
  checkQueueSize: () => Promise<number>;
  /** Get worker counts — idle approximation = total - active jobs */
  checkWorkers: () => Promise<{ activeJobs: number; totalWorkers: number }>;
  /** Scale workers UP by 1 */
  addWorker: () => Promise<void>;
  /** Scale workers DOWN by 1 */
  removeWorker: () => Promise<void>;

  /** Queue size threshold to trigger scale-up (default: 3) */
  queueScaleUpThreshold?: number;
  /** Queue size threshold to trigger scale-down (default: 0) */
  queueScaleDownThreshold?: number;
  /** Max idle rate before refusing to add more workers (default: 0.8) */
  maxIdleRate?: number;
  /** Min idle rate before refusing to remove workers (default: 0.1) */
  minIdleRate?: number;
  /** CPU usage threshold — skip scale-up if above (default: 90) */
  cpuThreshold?: number;
  /** Memory usage threshold — skip scale-up if above (default: 90) */
  memThreshold?: number;
  /** Check interval in ms (default: 2000) */
  checkInterval?: number;
  /** Minimum number of workers to maintain (default: 1) */
  minWorkers?: number;
  /** Maximum number of workers allowed (default: Infinity) */
  maxWorkers?: number;
}

/**
 * Distributed equivalent of ProcessBalancer.
 *
 * Monitors BullMQ queue depth and worker utilization, then calls
 * addWorker / removeWorker callbacks to scale the cluster.
 *
 * Works with any orchestrator: the caller wires the callbacks to
 * Cluster.scaleNodes(), K8s HPA, or whatever scaling mechanism is in use.
 */
export class DistributedBalancer {
  private interval?: ReturnType<typeof setInterval>;
  private prevQueueSize = 0;
  private running = false;
  private lastScaleAction = 0;
  private readonly cooldownMs = 10_000;

  private readonly checkQueueSize: () => Promise<number>;
  private readonly checkWorkers: () => Promise<{ activeJobs: number; totalWorkers: number }>;
  private readonly addWorker: () => Promise<void>;
  private readonly removeWorker: () => Promise<void>;

  private readonly queueScaleUpThreshold: number;
  private readonly queueScaleDownThreshold: number;
  private readonly maxIdleRate: number;
  private readonly minIdleRate: number;
  private readonly cpuThreshold: number;
  private readonly memThreshold: number;
  private readonly checkInterval: number;
  private readonly minWorkers: number;
  private readonly maxWorkers: number;

  constructor(config: DistributedBalancerConfig) {
    this.checkQueueSize  = config.checkQueueSize;
    this.checkWorkers    = config.checkWorkers;
    this.addWorker       = config.addWorker;
    this.removeWorker    = config.removeWorker;

    this.queueScaleUpThreshold   = config.queueScaleUpThreshold ?? 3;
    this.queueScaleDownThreshold = config.queueScaleDownThreshold ?? 0;
    this.maxIdleRate             = config.maxIdleRate ?? 0.8;
    this.minIdleRate             = config.minIdleRate ?? 0.1;
    this.cpuThreshold            = config.cpuThreshold ?? 90;
    this.memThreshold            = config.memThreshold ?? 90;
    this.checkInterval           = config.checkInterval ?? 2000;
    this.minWorkers              = config.minWorkers ?? 1;
    this.maxWorkers              = config.maxWorkers ?? Infinity;

    this.start();
  }

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.evaluate(), this.checkInterval);
    this.interval.unref();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async evaluate(): Promise<void> {
    if (this.running) { return; }
    this.running = true;

    try {
      const queueSize = await this.checkQueueSize();
      const { activeJobs, totalWorkers } = await this.checkWorkers();
      const idleWorkers = Math.max(0, totalWorkers - activeJobs);
      const idleRate = totalWorkers > 0 ? idleWorkers / totalWorkers : 0;
      const queueGrowth = queueSize - this.prevQueueSize;
      this.prevQueueSize = queueSize;

      const avgCpu = this.getCpuUsage();
      const avgMem = this.getMemoryUsage();

      const inCooldown = (Date.now() - this.lastScaleAction) < this.cooldownMs;

      const shouldScaleUp =
        !inCooldown &&
        queueSize > this.queueScaleUpThreshold &&
        queueGrowth > 0 &&
        avgCpu < this.cpuThreshold &&
        avgMem < this.memThreshold &&
        idleRate < this.maxIdleRate &&
        totalWorkers < this.maxWorkers;

      if (shouldScaleUp) {
        await this.addWorker();
        this.lastScaleAction = Date.now();
      }

      if (
        !inCooldown &&
        queueSize <= this.queueScaleDownThreshold &&
        idleWorkers > 1 &&
        queueGrowth <= 0 &&
        idleRate > this.minIdleRate &&
        totalWorkers > this.minWorkers
      ) {
        await this.removeWorker();
        this.lastScaleAction = Date.now();
      }
    } catch (err) {
      console.error('[DistributedBalancer] evaluate error:', err);
    } finally {
      this.running = false;
    }
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    const totalLoad = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((t, v) => t + v, 0);
      return acc + (cpu.times.user / total) * 100;
    }, 0);
    return totalLoad / cpus.length;
  }

  private getMemoryUsage(): number {
    return ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  }
}
