import { NodeConfig, ContainerInfo, NodeRole } from './orchestration/ContainerOrchestrator.cjs';

type ClusterMode = 'local' | 'docker' | 'k8s';
type SpawnOptions = {
    numberOfSpawns?: number;
    allowedToSpawn?: boolean;
    spawnOnlyFromPrimary?: boolean;
    metadata?: any;
};
/**
 * Per-service image configuration.
 * Used when different masters need different Docker images.
 *
 * Example:
 *   services: {
 *     proxy:   { image: 'myorg/proxy:latest' },
 *     users:   { image: 'myorg/users:latest' },
 *     scripts: { image: 'myorg/scripts:latest', concurrency: 4 },
 *   }
 */
type ServiceMap = Record<string, Partial<NodeConfig>>;
interface ClusterOptions {
    numberOfProcesses?: number;
    process_timeout?: number;
    crash_on_error?: boolean;
    debugging?: boolean;
    /**
     * Execution mode:
     *   'local'  — child_process.fork (default, existing behaviour)
     *   'docker' — Docker daemon containers
     *   'k8s'    — Kubernetes API (master=Deployment, process=Job)
     */
    mode?: ClusterMode;
    /** Base node config shared by all spawned nodes. */
    node?: NodeConfig;
    /**
     * Per-service overrides.
     * spawnMaster('users') merges services['users'] over `node`.
     */
    services?: ServiceMap;
    [key: string]: unknown;
}
declare class Cluster {
    numberOfProcesses: number;
    process_timeout: number;
    crash_on_error: boolean;
    thisProcess: any;
    type: string;
    processes: any[];
    allowedToSpawn: boolean;
    spawnOnlyFromPrimary: boolean;
    debugging: boolean;
    private readonly mode;
    private readonly orchestrator?;
    private readonly services;
    private readonly baseNode?;
    constructor(options: ClusterOptions);
    /**
     * Unified spawn method — preserves the existing local-mode API.
     * In container modes the process_type is used as the service name.
     */
    spawn(process_type: string, { numberOfSpawns, allowedToSpawn, spawnOnlyFromPrimary, metadata }?: SpawnOptions): Promise<ContainerInfo[]> | void;
    /**
     * Deploy the primary node as a persistent Deployment in k8s / container
     * in Docker.  The primary is the root of the hierarchy — it orchestrates
     * masters and stays alive indefinitely.
     *
     * In local mode this is a no-op (the current process IS the primary).
     */
    spawnPrimary(overrides?: Partial<NodeConfig>): Promise<ContainerInfo>;
    /**
     * Spawn a persistent master node for the named service.
     *
     * In k8s: creates a Deployment (replicas=count, restarts on failure).
     * In docker: creates a container with RestartPolicy=on-failure.
     * In local: delegates to spawn() (fork).
     *
     * Config is merged: baseNode → services[name] → overrides.
     */
    spawnMaster(serviceName: string, overrides?: Partial<NodeConfig>, count?: number): Promise<ContainerInfo[]>;
    /**
     * Spawn an ephemeral process node for the named service.
     *
     * In k8s: creates a Job (ttlSecondsAfterFinished=60, restartPolicy=Never).
     * In docker: creates a container with RestartPolicy=no.
     * In local: delegates to spawn() (fork, one-shot by nature).
     *
     * Config is merged: baseNode → services[name] → overrides.
     */
    spawnProcess(serviceName: string, overrides?: Partial<NodeConfig>): Promise<ContainerInfo>;
    /** Scale master nodes for a named service to exactly `count` replicas. */
    scaleNodes(count: number, serviceName: string): Promise<ContainerInfo[]>;
    removeNode(id: string): Promise<void>;
    listNodes(role?: NodeRole): Promise<ContainerInfo[]>;
    close(): Promise<void>;
    /**
     * Generate a Kubernetes YAML manifest for any node role without
     * touching the API — useful for GitOps or dry-run previews.
     */
    generateManifest(serviceName: string, role: NodeRole, overrides?: Partial<NodeConfig>): string;
    private isProcessAllowedToSpawn;
    get_this_process(): any;
    get_processes(): any[];
    is(process_type: string): boolean;
    private amIThePrimaryProcess;
    isPrimary(): boolean;
    private amIChildProcess;
    private log;
    getMetadata(): string | undefined;
    private buildNodeConfig;
    private requireOrchestrator;
}

export { type ClusterMode, type ClusterOptions, type ServiceMap, type SpawnOptions, Cluster as default };
