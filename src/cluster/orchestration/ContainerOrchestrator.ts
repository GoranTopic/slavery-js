/**
 * Abstract orchestration layer for dynamically spawning / removing containers.
 *
 * Hierarchy:
 *   primary  — the root container (always running, orchestrates masters)
 *   master   — persistent service container (Deployment), spawned by primary
 *   process  — ephemeral task container (Job/Pod), spawned by a master
 *
 * Two concrete implementations ship out of the box:
 *   DockerOrchestrator  → talks to the Docker daemon (local / CI)
 *   K8sOrchestrator     → talks to the Kubernetes API (production)
 */

// ── Node role ────────────────────────────────────────────────────────────────

/** Role of a node in the cluster hierarchy. */
export type NodeRole = 'primary' | 'master' | 'process';

// ── Status ───────────────────────────────────────────────────────────────────

export type ContainerStatus =
  | 'creating'
  | 'running'
  | 'stopped'
  | 'removing'
  | 'unknown';

// ── ContainerInfo ─────────────────────────────────────────────────────────────

export interface ContainerInfo {
  /** Unique container / pod / job ID assigned by the runtime */
  id: string;
  /** Human-readable name */
  name: string;
  role: NodeRole;
  status: ContainerStatus;
  createdAt: Date;
  /** Arbitrary metadata attached by the orchestrator */
  labels: Record<string, string>;
}

// ── NodeConfig ────────────────────────────────────────────────────────────────

/**
 * Configuration for any node in the cluster hierarchy.
 * Replaces WorkerContainerConfig — now role-aware.
 */
export interface NodeConfig {
  /** Docker image to run */
  image: string;
  /**
   * Role of this node.
   * - master  → persistent Deployment (default when unset for backwards-compat)
   * - process → ephemeral Job (auto-deleted on completion)
   * - primary → used for self-identification only; not spawned via orchestrator
   */
  role?: NodeRole;
  /** Cluster-level identifier — groups all resources of a cluster instance */
  serviceName: string;
  /**
   * Type of service within the cluster (e.g. 'proxy', 'users', 'scripts').
   * Used to distinguish different masters/processes under the same cluster.
   * Defaults to serviceName if not set.
   */
  serviceType?: string;
  /** Redis URL nodes connect to */
  redisUrl: string;
  /** BullMQ concurrency per node (default 1) */
  concurrency?: number;
  /** Health-check port inside the container (default 3001) */
  healthPort?: number;
  /** Extra environment variables forwarded to the container */
  env?: Record<string, string>;
  /** Number of replicas for master Deployments (default 1) */
  replicas?: number;
  /** Override the generated container/pod name */
  name?: string;

  // ── Docker-specific ──────────────────────────────────────────────────────
  /** Docker network to join (default: bridge) */
  network?: string;

  // ── Kubernetes-specific ──────────────────────────────────────────────────
  /** K8s namespace (default: "default") */
  namespace?: string;
  /** Resource requests / limits */
  resources?: {
    requests?: { cpu?: string; memory?: string };
    limits?: { cpu?: string; memory?: string };
  };
}

/** @deprecated Use NodeConfig */
export type WorkerContainerConfig = NodeConfig;

// ── Interface ────────────────────────────────────────────────────────────────

export interface ContainerOrchestrator {
  /**
   * Spawn a node according to its role:
   *   master  → persistent workload (Deployment / long-running container)
   *   process → ephemeral workload (Job / one-shot container)
   */
  spawnNode(config: NodeConfig): Promise<ContainerInfo>;

  /** Stop and remove a node by its ID. */
  removeNode(id: string): Promise<void>;

  /** List all nodes managed by this orchestrator, optionally filtered by role. */
  listNodes(role?: NodeRole): Promise<ContainerInfo[]>;

  /**
   * Scale master nodes to exactly `count` replicas.
   * Only applies to persistent (master) workloads.
   */
  scaleNodes(count: number, serviceName: string): Promise<ContainerInfo[]>;

  /** Tear down all managed nodes and release resources. */
  close(): Promise<void>;
}
