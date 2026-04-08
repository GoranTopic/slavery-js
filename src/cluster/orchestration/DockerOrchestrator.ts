import Docker from 'dockerode';
import type {
  ContainerOrchestrator,
  ContainerInfo,
  ContainerStatus,
  NodeConfig,
  NodeRole,
} from './ContainerOrchestrator.js';

const MANAGED_LABEL      = 'slavery-js.managed';
const SERVICE_LABEL      = 'slavery-js.service';
const SERVICE_TYPE_LABEL = 'slavery-js.service-type';
const ROLE_LABEL         = 'slavery-js.role';

/**
 * Docker orchestrator implementing the cluster node hierarchy.
 *
 * In Docker all nodes are containers — there is no native distinction
 * between persistent and ephemeral workloads. The role is encoded in
 * container labels and the restart policy:
 *   master  → RestartPolicy: on-failure (persistent)
 *   process → RestartPolicy: no          (ephemeral, exits and stays stopped)
 */
export class DockerOrchestrator implements ContainerOrchestrator {
  private readonly docker: Docker;
  private nodeIndex = 0;

  constructor(
    private readonly baseConfig: NodeConfig,
    dockerOptions?: Docker.DockerOptions,
  ) {
    this.docker = new Docker(dockerOptions);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  async spawnNode(config: NodeConfig): Promise<ContainerInfo> {
    const cfg  = { ...this.baseConfig, ...config };
    const role = cfg.role ?? 'master';
    const name = cfg.name ?? this.nodeName(cfg, role);

    const labels: Record<string, string> = {
      [MANAGED_LABEL]:      'true',
      [SERVICE_LABEL]:      cfg.serviceName,
      [SERVICE_TYPE_LABEL]: cfg.serviceType ?? cfg.serviceName,
      [ROLE_LABEL]:         role,
    };

    const createOpts: Docker.ContainerCreateOptions = {
      Image:  cfg.image,
      name,
      Env:    this.buildEnv(cfg),
      Labels: labels,
      ExposedPorts: { [`${cfg.healthPort ?? 3001}/tcp`]: {} },
      HostConfig: {
        NetworkMode: cfg.network ?? 'bridge',
        RestartPolicy: role === 'process'
          ? { Name: 'no' }
          : { Name: 'on-failure', MaximumRetryCount: 3 },
      },
    };

    const container = await this.docker.createContainer(createOpts);
    await container.start();
    const info = await container.inspect();

    return {
      id:        info.Id,
      name:      info.Name.replace(/^\//, ''),
      role,
      status:    this.mapDockerState(info.State.Status),
      createdAt: new Date(info.Created),
      labels:    info.Config.Labels ?? {},
    };
  }

  async removeNode(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    try { await container.stop({ t: 10 }); } catch { /* already stopped */ }
    await container.remove({ force: true });
  }

  async listNodes(role?: NodeRole): Promise<ContainerInfo[]> {
    const labelFilters = [
      `${MANAGED_LABEL}=true`,
      `${SERVICE_LABEL}=${this.baseConfig.serviceName}`,
    ];
    if (role) labelFilters.push(`${ROLE_LABEL}=${role}`);

    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: labelFilters },
    });

    return containers.map(c => ({
      id:        c.Id,
      name:      (c.Names[0] ?? '').replace(/^\//, ''),
      role:      (c.Labels?.[ROLE_LABEL] ?? 'master') as NodeRole,
      status:    this.mapDockerState(c.State),
      createdAt: new Date(c.Created * 1000),
      labels:    c.Labels ?? {},
    }));
  }

  async scaleNodes(count: number, serviceName: string): Promise<ContainerInfo[]> {
    const current = await this.listNodes('master');
    const running = current.filter(c => c.status === 'running');
    const diff    = count - running.length;

    if (diff > 0) {
      await Promise.all(
        Array.from({ length: diff }, () =>
          this.spawnNode({ ...this.baseConfig, serviceName, role: 'master' }),
        ),
      );
    } else if (diff < 0) {
      await Promise.all(
        running.slice(0, Math.abs(diff)).map(c => this.removeNode(c.id)),
      );
    }

    return this.listNodes('master');
  }

  async close(): Promise<void> {
    const nodes = await this.listNodes();
    await Promise.all(nodes.map(n => this.removeNode(n.id)));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private nodeName(cfg: NodeConfig, role: NodeRole): string {
    const svcType = cfg.serviceType ?? cfg.serviceName;
    return `slavery-${role}-${svcType}-${++this.nodeIndex}-${Date.now()}`;
  }

  private buildEnv(cfg: NodeConfig): string[] {
    const base: Record<string, string> = {
      SERVICE_NAME:       cfg.serviceName,
      REDIS_URL:          cfg.redisUrl,
      WORKER_CONCURRENCY: String(cfg.concurrency ?? 1),
      HEALTH_PORT:        String(cfg.healthPort ?? 3001),
      NODE_ENV:           'production',
    };
    return Object.entries({ ...base, ...(cfg.env ?? {}) }).map(([k, v]) => `${k}=${v}`);
  }

  private mapDockerState(state: string): ContainerStatus {
    switch (state.toLowerCase()) {
      case 'running':    return 'running';
      case 'created':
      case 'restarting': return 'creating';
      case 'exited':
      case 'dead':       return 'stopped';
      case 'removing':   return 'removing';
      default:           return 'unknown';
    }
  }
}
