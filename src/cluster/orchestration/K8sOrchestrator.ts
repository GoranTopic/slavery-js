import * as k8s from '@kubernetes/client-node';
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
 * Kubernetes orchestrator implementing the cluster node hierarchy:
 *
 *   master  → Deployment  (persistent, restarts on failure)
 *   process → Job         (ephemeral, auto-deleted on completion)
 *
 * Reads kubeconfig from the default locations (in-cluster SA or ~/.kube/config).
 */
export class K8sOrchestrator implements ContainerOrchestrator {
  private readonly coreApi: k8s.CoreV1Api;
  private readonly appsApi: k8s.AppsV1Api;
  private readonly batchApi: k8s.BatchV1Api;
  private readonly namespace: string;
  private nodeIndex = 0;

  constructor(
    private readonly baseConfig: NodeConfig,
    options?: {
      kubeConfig?: k8s.KubeConfig;
    },
  ) {
    this.namespace = baseConfig.namespace ?? 'default';

    // API clients are optional — if no cluster is available (e.g. manifest-only
    // usage via generateManifest), the constructor still succeeds. Any API call
    // will throw a clear error at call time instead.
    try {
      const kc = options?.kubeConfig ?? new k8s.KubeConfig();
      if (!options?.kubeConfig) kc.loadFromDefault();
      this.coreApi  = kc.makeApiClient(k8s.CoreV1Api);
      this.appsApi  = kc.makeApiClient(k8s.AppsV1Api);
      this.batchApi = kc.makeApiClient(k8s.BatchV1Api);
    } catch {
      // No cluster configured — API methods will throw if called
      this.coreApi  = null as any;
      this.appsApi  = null as any;
      this.batchApi = null as any;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Spawn a node according to its role:
   *   master  → creates or patches a Deployment (persistent)
   *   process → creates a Job (ephemeral, deleted on completion)
   */
  async spawnNode(config: NodeConfig): Promise<ContainerInfo> {
    const cfg  = { ...this.baseConfig, ...config };
    const role = cfg.role ?? 'master';

    if (role === 'process') return this.spawnJob(cfg);
    return this.spawnDeployment(cfg, role);
  }

  async removeNode(id: string): Promise<void> {
    // Try Deployment first, then Job, then Pod
    await Promise.allSettled([
      this.appsApi.deleteNamespacedDeployment({ name: id, namespace: this.namespace }),
      this.batchApi.deleteNamespacedJob({
        name: id, namespace: this.namespace,
        propagationPolicy: 'Foreground',
      }),
      this.coreApi.deleteNamespacedPod({ name: id, namespace: this.namespace }),
    ]);
  }

  async listNodes(role?: NodeRole): Promise<ContainerInfo[]> {
    const labelSelector = role
      ? `${MANAGED_LABEL}=true,${SERVICE_LABEL}=${this.baseConfig.serviceName},${ROLE_LABEL}=${role}`
      : `${MANAGED_LABEL}=true,${SERVICE_LABEL}=${this.baseConfig.serviceName}`;

    const [deployments, jobs] = await Promise.all([
      this.appsApi.listNamespacedDeployment({ namespace: this.namespace, labelSelector })
        .then(r => r.items ?? []),
      this.batchApi.listNamespacedJob({ namespace: this.namespace, labelSelector })
        .then(r => r.items ?? []),
    ]);

    return [
      ...deployments.map(d => this.deploymentToInfo(d)),
      ...jobs.map(j => this.jobToInfo(j)),
    ];
  }

  async scaleNodes(count: number, serviceName: string): Promise<ContainerInfo[]> {
    const labelSelector = `${MANAGED_LABEL}=true,${SERVICE_LABEL}=${serviceName},${ROLE_LABEL}=master`;
    const deployments = await this.appsApi
      .listNamespacedDeployment({ namespace: this.namespace, labelSelector })
      .then(r => r.items ?? []);

    await Promise.all(
      deployments.map(async (d) => {
        const name = d.metadata!.name!;
        const scale = await this.appsApi.readNamespacedDeploymentScale({
          name, namespace: this.namespace,
        });
        scale.spec = { ...scale.spec, replicas: count };
        await this.appsApi.replaceNamespacedDeploymentScale({
          name, namespace: this.namespace, body: scale,
        });
      }),
    );

    return this.listNodes('master');
  }

  async close(): Promise<void> {
    const nodes = await this.listNodes();
    await Promise.all(nodes.map(n => this.removeNode(n.id)));
  }

  // ── Manifest generation ─────────────────────────────────────────────────

  /**
   * Generate a YAML manifest string for any node role.
   * Use to apply resources without going through the K8s API:
   *   kubectl apply -f <(node -e "console.log(K8sOrchestrator.generateManifest({...}))")
   */
  static generateManifest(config: NodeConfig): string {
    const role = config.role ?? 'master';
    if (role === 'process') return K8sOrchestrator.buildJobYaml(config);
    return K8sOrchestrator.buildDeploymentYaml(config);
  }

  // ── Private: spawn strategies ───────────────────────────────────────────

  private async spawnDeployment(cfg: NodeConfig, role: NodeRole = 'master'): Promise<ContainerInfo> {
    const name = cfg.name ?? this.nodeName(cfg, role);
    const body: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name,
        namespace: this.namespace,
        labels: this.labels(cfg, role),
      },
      spec: {
        replicas: cfg.replicas ?? 1,
        selector: { matchLabels: { 'slavery-js.node': name } },
        template: {
          metadata: { labels: { ...this.labels(cfg, role), 'slavery-js.node': name } },
          spec: {
            terminationGracePeriodSeconds: 30,
            containers: [this.containerSpec(cfg)],
          },
        },
      },
    };

    const created = await this.appsApi.createNamespacedDeployment({
      namespace: this.namespace, body,
    });
    return this.deploymentToInfo(created, role);
  }

  private async spawnJob(cfg: NodeConfig): Promise<ContainerInfo> {
    const name = cfg.name ?? this.nodeName(cfg, 'process');
    const body: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name,
        namespace: this.namespace,
        labels: this.labels(cfg, 'process'),
      },
      spec: {
        ttlSecondsAfterFinished: 60, // auto-delete 60s after completion
        backoffLimit: 0,             // no retries — ephemeral tasks fail fast
        template: {
          metadata: { labels: this.labels(cfg, 'process') },
          spec: {
            restartPolicy: 'Never',
            terminationGracePeriodSeconds: 30,
            containers: [this.containerSpec(cfg)],
          },
        },
      },
    };

    const created = await this.batchApi.createNamespacedJob({
      namespace: this.namespace, body,
    });
    return this.jobToInfo(created);
  }

  // ── Private: helpers ────────────────────────────────────────────────────

  private nodeName(cfg: NodeConfig, role: NodeRole): string {
    const svcType = cfg.serviceType ?? cfg.serviceName;
    return `slavery-${role}-${svcType}-${++this.nodeIndex}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
  }

  private labels(cfg: NodeConfig, role: NodeRole): Record<string, string> {
    return {
      [MANAGED_LABEL]:      'true',
      [SERVICE_LABEL]:      cfg.serviceName,
      [SERVICE_TYPE_LABEL]: cfg.serviceType ?? cfg.serviceName,
      [ROLE_LABEL]:         role,
      app:                  `slavery-${role}`,
    };
  }

  private containerSpec(cfg: NodeConfig): k8s.V1Container {
    const port = cfg.healthPort ?? 3001;
    const spec: k8s.V1Container = {
      name:      'worker',
      image:     cfg.image,
      imagePullPolicy: cfg.imagePullPolicy ?? 'IfNotPresent',
      env:       this.buildEnv(cfg),
      resources: cfg.resources
        ? { requests: cfg.resources.requests, limits: cfg.resources.limits }
        : undefined,
      ports: [{ containerPort: port, name: 'health' }],
    };

    if (cfg.command) spec.command = cfg.command;
    if (cfg.args)    spec.args = cfg.args;

    // Probes only make sense for long-running workloads (primary / master)
    const role = cfg.role ?? 'master';
    if (role !== 'process') {
      spec.readinessProbe = {
        httpGet: { path: '/ready', port: port as any },
        periodSeconds: 5, failureThreshold: 3,
      };
      spec.livenessProbe = {
        httpGet: { path: '/health', port: port as any },
        periodSeconds: 15, failureThreshold: 3,
      };
    }

    return spec;
  }

  private buildEnv(cfg: NodeConfig): k8s.V1EnvVar[] {
    const base: Record<string, string> = {
      CLUSTER_NAME:       cfg.serviceName,
      SERVICE_NAME:       cfg.serviceType ?? cfg.serviceName,
      SERVICE_TYPE:       cfg.serviceType ?? cfg.serviceName,
      NODE_ROLE:          cfg.role ?? 'master',
      REDIS_URL:          cfg.redisUrl,
      WORKER_CONCURRENCY: String(cfg.concurrency ?? 1),
      HEALTH_PORT:        String(cfg.healthPort ?? 3001),
      NODE_ENV:           'production',
    };
    return Object.entries({ ...base, ...(cfg.env ?? {}) }).map(([name, value]) => ({ name, value }));
  }

  private deploymentToInfo(d: k8s.V1Deployment, role?: NodeRole): ContainerInfo {
    const available = d.status?.availableReplicas ?? 0;
    const desired   = d.spec?.replicas ?? 1;
    const resolvedRole = role ?? (d.metadata?.labels?.[ROLE_LABEL] as NodeRole) ?? 'master';
    return {
      id:        d.metadata?.name ?? '',
      name:      d.metadata?.name ?? '',
      role:      resolvedRole,
      status:    available >= desired ? 'running' : 'creating',
      createdAt: d.metadata?.creationTimestamp ? new Date(d.metadata.creationTimestamp) : new Date(),
      labels:    d.metadata?.labels ?? {},
    };
  }

  private jobToInfo(j: k8s.V1Job): ContainerInfo {
    const succeeded = j.status?.succeeded ?? 0;
    const failed    = j.status?.failed    ?? 0;
    const active    = j.status?.active    ?? 0;
    let status: ContainerStatus = 'unknown';
    if (active > 0)    status = 'running';
    else if (succeeded > 0) status = 'stopped';
    else if (failed > 0)    status = 'stopped';
    else                    status = 'creating';

    return {
      id:        j.metadata?.name ?? '',
      name:      j.metadata?.name ?? '',
      role:      'process',
      status,
      createdAt: j.metadata?.creationTimestamp ? new Date(j.metadata.creationTimestamp) : new Date(),
      labels:    j.metadata?.labels ?? {},
    };
  }

  // ── Private: YAML builders ──────────────────────────────────────────────

  private static buildDeploymentYaml(cfg: NodeConfig): string {
    const role    = cfg.role ?? 'master';
    const svcType = cfg.serviceType ?? cfg.serviceName;
    const name    = cfg.name ?? `slavery-${role}-${svcType}`;
    const ns      = cfg.namespace ?? 'default';
    const port    = cfg.healthPort ?? 3001;

    const envLines  = K8sOrchestrator.envYaml(cfg, 8);
    const resources = K8sOrchestrator.resourcesYaml(cfg, 10);

    return [
      `apiVersion: apps/v1`,
      `kind: Deployment`,
      `metadata:`,
      `  name: ${name}`,
      `  namespace: ${ns}`,
      `  labels:`,
      `    app: slavery-${role}`,
      `    ${MANAGED_LABEL}: "true"`,
      `    ${SERVICE_LABEL}: "${cfg.serviceName}"`,
      `    ${SERVICE_TYPE_LABEL}: "${svcType}"`,
      `    ${ROLE_LABEL}: ${role}`,
      `spec:`,
      `  replicas: ${cfg.replicas ?? 1}`,
      `  selector:`,
      `    matchLabels:`,
      `      slavery-js.node: ${name}`,
      `  template:`,
      `    metadata:`,
      `      labels:`,
      `        app: slavery-${role}`,
      `        ${MANAGED_LABEL}: "true"`,
      `        ${SERVICE_LABEL}: "${cfg.serviceName}"`,
      `        ${SERVICE_TYPE_LABEL}: "${svcType}"`,
      `        ${ROLE_LABEL}: ${role}`,
      `        slavery-js.node: ${name}`,
      `    spec:`,
      `      terminationGracePeriodSeconds: 30`,
      `      containers:`,
      `        - name: worker`,
      `          image: ${cfg.image}`,
      `          imagePullPolicy: ${cfg.imagePullPolicy ?? 'IfNotPresent'}`,
      `          env:`,
      envLines,
      `          ports:`,
      `            - name: health`,
      `              containerPort: ${port}`,
      `          readinessProbe:`,
      `            httpGet: { path: /ready, port: ${port} }`,
      `            periodSeconds: 5`,
      `            failureThreshold: 3`,
      `          livenessProbe:`,
      `            httpGet: { path: /health, port: ${port} }`,
      `            periodSeconds: 15`,
      `            failureThreshold: 3`,
      resources,
    ].filter(Boolean).join('\n');
  }

  private static buildJobYaml(cfg: NodeConfig): string {
    const svcType = cfg.serviceType ?? cfg.serviceName;
    const name = cfg.name ?? `slavery-process-${svcType}-${Date.now()}`;
    const ns   = cfg.namespace ?? 'default';
    const port = cfg.healthPort ?? 3001;

    const envLines = K8sOrchestrator.envYaml(cfg, 8);

    return [
      `apiVersion: batch/v1`,
      `kind: Job`,
      `metadata:`,
      `  name: ${name}`,
      `  namespace: ${ns}`,
      `  labels:`,
      `    app: slavery-process`,
      `    ${MANAGED_LABEL}: "true"`,
      `    ${SERVICE_LABEL}: "${cfg.serviceName}"`,
      `    ${SERVICE_TYPE_LABEL}: "${svcType}"`,
      `    ${ROLE_LABEL}: process`,
      `spec:`,
      `  ttlSecondsAfterFinished: 60`,
      `  backoffLimit: 0`,
      `  template:`,
      `    metadata:`,
      `      labels:`,
      `        app: slavery-process`,
      `        ${MANAGED_LABEL}: "true"`,
      `        ${SERVICE_LABEL}: "${cfg.serviceName}"`,
      `        ${SERVICE_TYPE_LABEL}: "${svcType}"`,
      `        ${ROLE_LABEL}: process`,
      `    spec:`,
      `      restartPolicy: Never`,
      `      terminationGracePeriodSeconds: 30`,
      `      containers:`,
      `        - name: worker`,
      `          image: ${cfg.image}`,
      `          imagePullPolicy: ${cfg.imagePullPolicy ?? 'IfNotPresent'}`,
      `          env:`,
      envLines,
      `          ports:`,
      `            - name: health`,
      `              containerPort: ${port}`,
    ].filter(Boolean).join('\n');
  }

  private static envYaml(cfg: NodeConfig, indent: number): string {
    const pad = ' '.repeat(indent);
    const base: Record<string, string> = {
      CLUSTER_NAME:       cfg.serviceName,
      SERVICE_NAME:       cfg.serviceType ?? cfg.serviceName,
      SERVICE_TYPE:       cfg.serviceType ?? cfg.serviceName,
      NODE_ROLE:          cfg.role ?? 'master',
      REDIS_URL:          cfg.redisUrl,
      WORKER_CONCURRENCY: String(cfg.concurrency ?? 1),
      HEALTH_PORT:        String(cfg.healthPort ?? 3001),
    };
    return Object.entries({ ...base, ...(cfg.env ?? {}) })
      .map(([k, v]) => `${pad}- name: ${k}\n${pad}  value: "${v}"`)
      .join('\n');
  }

  private static resourcesYaml(cfg: NodeConfig, indent: number): string {
    if (!cfg.resources) return '';
    const pad = ' '.repeat(indent);
    const lines = [`${pad}resources:`];
    if (cfg.resources.requests) {
      lines.push(`${pad}  requests:`);
      if (cfg.resources.requests.cpu)    lines.push(`${pad}    cpu: "${cfg.resources.requests.cpu}"`);
      if (cfg.resources.requests.memory) lines.push(`${pad}    memory: "${cfg.resources.requests.memory}"`);
    }
    if (cfg.resources.limits) {
      lines.push(`${pad}  limits:`);
      if (cfg.resources.limits.cpu)    lines.push(`${pad}    cpu: "${cfg.resources.limits.cpu}"`);
      if (cfg.resources.limits.memory) lines.push(`${pad}    memory: "${cfg.resources.limits.memory}"`);
    }
    return lines.join('\n');
  }
}
