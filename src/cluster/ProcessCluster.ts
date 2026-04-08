import { fork } from 'child_process';
import process from 'node:process';
import { DockerOrchestrator } from './orchestration/DockerOrchestrator.js';
import { K8sOrchestrator } from './orchestration/K8sOrchestrator.js';
import type {
  ContainerOrchestrator,
  ContainerInfo,
  NodeConfig,
  NodeRole,
} from './orchestration/ContainerOrchestrator.js';

export type ClusterMode = 'local' | 'docker' | 'k8s';

export type SpawnOptions = {
    numberOfSpawns?: number;
    allowedToSpawn?: boolean;
    spawnOnlyFromPrimary?: boolean;
    metadata?: any;
}

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
export type ServiceMap = Record<string, Partial<NodeConfig>>;

export interface ClusterOptions {
    // ── Local mode ─────────────────────────────────────────────────────────
    numberOfProcesses?: number;
    process_timeout?: number;
    crash_on_error?: boolean;
    debugging?: boolean;

    // ── Mode selection ─────────────────────────────────────────────────────
    /**
     * Execution mode:
     *   'local'  — child_process.fork (default, existing behaviour)
     *   'docker' — Docker daemon containers
     *   'k8s'    — Kubernetes API (master=Deployment, process=Job)
     */
    mode?: ClusterMode;

    // ── Container modes (docker / k8s) ────────────────────────────────────
    /** Base node config shared by all spawned nodes. */
    node?: NodeConfig;

    /**
     * Per-service overrides.
     * spawnMaster('users') merges services['users'] over `node`.
     */
    services?: ServiceMap;

    // Allow existing callers (Service.ts, NodeManager, etc.) to pass
    // arbitrary options without breaking compilation.
    [key: string]: unknown;
}

class Cluster {
    // ── Existing local-mode fields (unchanged) ────────────────────────────
    numberOfProcesses: number;
    process_timeout: number;
    crash_on_error: boolean;
    thisProcess: any;
    type: string;
    processes: any[];
    allowedToSpawn: boolean;
    spawnOnlyFromPrimary: boolean;
    debugging: boolean;

    private readonly mode: ClusterMode;
    private readonly orchestrator?: ContainerOrchestrator;
    private readonly services: ServiceMap;
    private readonly baseNode?: NodeConfig;

    constructor(options: ClusterOptions) {
        this.numberOfProcesses    = options.numberOfProcesses || null as any;
        this.process_timeout      = options.process_timeout   || null as any;
        this.crash_on_error       = options.crash_on_error    || false;
        this.debugging            = options.debugging         || false;
        this.type                 = process.env.type          || 'primary';
        this.allowedToSpawn       = process.env.allowedToSpawn === 'true' || false;
        this.spawnOnlyFromPrimary = false;
        this.thisProcess          = process;
        this.processes            = [];
        this.mode                 = options.mode ?? 'local';
        this.services             = options.services ?? {};
        this.baseNode             = options.node;

        if (this.mode === 'docker' && options.node) {
            this.orchestrator = new DockerOrchestrator(options.node);
        } else if (this.mode === 'k8s' && options.node) {
            this.orchestrator = new K8sOrchestrator(options.node);
        }
    }

    // ── Core spawn ────────────────────────────────────────────────────────

    /**
     * Unified spawn method — preserves the existing local-mode API.
     * In container modes the process_type is used as the service name.
     */
    public spawn(process_type: string, {
        numberOfSpawns, allowedToSpawn, spawnOnlyFromPrimary, metadata
    }: SpawnOptions = {}): Promise<ContainerInfo[]> | void {
        if (this.mode !== 'local') {
            // Container mode: spawn as master nodes (persistent)
            const count = numberOfSpawns ?? 1;
            return this.spawnMaster(process_type, {}, count);
        }

        // ── Local fork logic (unchanged) ──────────────────────────────────
        this.log('Spawning new process ' + process_type);
        this.log(`allowedToSpawn: ${allowedToSpawn}`);
        this.log('this.amIThePrimaryProcess(): ' + this.amIThePrimaryProcess());
        if (numberOfSpawns === undefined) numberOfSpawns = 1;
        this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
        if (this.amIThePrimaryProcess() && allowedToSpawn) allowedToSpawn = true;
        else allowedToSpawn = false;
        this.log('final passing on allowedToSpawn ' + allowedToSpawn);
        if (this.isProcessAllowedToSpawn() === false) return;
        for (let i = 0; i < numberOfSpawns; i++) {
            const child = fork(
                process.argv[1], [], {
                    env: {
                        is_child:      'true',
                        type:          process_type,
                        allowedToSpawn: `${allowedToSpawn}`,
                        metadata:      JSON.stringify(metadata),
                    }
                }
            );
            this.processes.push(child);
        }
    }

    // ── Hierarchical spawn API ─────────────────────────────────────────────

    /**
     * Spawn a persistent master node for the named service.
     *
     * In k8s: creates a Deployment (replicas=count, restarts on failure).
     * In docker: creates a container with RestartPolicy=on-failure.
     * In local: delegates to spawn() (fork).
     *
     * Config is merged: baseNode → services[name] → overrides.
     */
    async spawnMaster(
        serviceName: string,
        overrides: Partial<NodeConfig> = {},
        count = 1,
    ): Promise<ContainerInfo[]> {
        if (this.mode === 'local') {
            this.spawn(serviceName, { numberOfSpawns: count, allowedToSpawn: true, spawnOnlyFromPrimary: true });
            return [];
        }
        this.requireOrchestrator('spawnMaster');
        const cfg = this.buildNodeConfig(serviceName, 'master', overrides, count);
        const results: ContainerInfo[] = [];
        for (let i = 0; i < count; i++) {
            results.push(await this.orchestrator!.spawnNode(cfg));
        }
        return results;
    }

    /**
     * Spawn an ephemeral process node for the named service.
     *
     * In k8s: creates a Job (ttlSecondsAfterFinished=60, restartPolicy=Never).
     * In docker: creates a container with RestartPolicy=no.
     * In local: delegates to spawn() (fork, one-shot by nature).
     *
     * Config is merged: baseNode → services[name] → overrides.
     */
    async spawnProcess(
        serviceName: string,
        overrides: Partial<NodeConfig> = {},
    ): Promise<ContainerInfo> {
        if (this.mode === 'local') {
            this.spawn(serviceName, { numberOfSpawns: 1 });
            return { id: '', name: serviceName, role: 'process', status: 'creating', createdAt: new Date(), labels: {} };
        }
        this.requireOrchestrator('spawnProcess');
        const cfg = this.buildNodeConfig(serviceName, 'process', overrides, 1);
        return this.orchestrator!.spawnNode(cfg);
    }

    // ── Scaling ───────────────────────────────────────────────────────────

    /** Scale master nodes for a named service to exactly `count` replicas. */
    async scaleNodes(count: number, serviceName: string): Promise<ContainerInfo[]> {
        this.requireOrchestrator('scaleNodes');
        return this.orchestrator!.scaleNodes(count, serviceName);
    }

    // ── Query / remove ────────────────────────────────────────────────────

    async removeNode(id: string): Promise<void> {
        this.requireOrchestrator('removeNode');
        return this.orchestrator!.removeNode(id);
    }

    async listNodes(role?: NodeRole): Promise<ContainerInfo[]> {
        this.requireOrchestrator('listNodes');
        return this.orchestrator!.listNodes(role);
    }

    async close(): Promise<void> {
        if (this.orchestrator) await this.orchestrator.close();
    }

    // ── Manifest generation (k8s only) ────────────────────────────────────

    /**
     * Generate a Kubernetes YAML manifest for any node role without
     * touching the API — useful for GitOps or dry-run previews.
     */
    generateManifest(
        serviceName: string,
        role: NodeRole,
        overrides: Partial<NodeConfig> = {},
    ): string {
        const cfg = this.buildNodeConfig(serviceName, role, overrides, 1);
        return K8sOrchestrator.generateManifest(cfg);
    }

    // ── Existing local helpers (unchanged) ────────────────────────────────

    private isProcessAllowedToSpawn() {
        if (this.spawnOnlyFromPrimary && this.amIChildProcess()) return false;
        if (this.amIThePrimaryProcess()) {
            this.log('Primary process is allowed to spawn new processes');
            return true;
        } else this.log('Process is not the primary process');
        if (this.allowedToSpawn) {
            this.log('Process is allowed to spawn new processes');
            return true;
        } else this.log('Process is not allowed to spawn new processes');
        return false;
    }

    get_this_process() { return this.thisProcess; }
    get_processes()    { return this.processes; }

    public is(process_type: string) {
        this.log(`checking if is process ${process_type}`);
        if (process_type === 'primary') return this.amIThePrimaryProcess();
        return process.env.type === process_type;
    }

    private amIThePrimaryProcess() {
        if (this.thisProcess.env.is_child === undefined) return true;
        if (this.thisProcess.env.is_child === null)      return true;
        if (this.thisProcess.env.is_child === 'false')   return true;
        return false;
    }

    public isPrimary() { return this.amIThePrimaryProcess(); }

    private amIChildProcess() { return process.env.is_child === 'true'; }

    private log(message: string) {
        this.debugging && console.log(`[${process.pid}][${this.type}] ${message}`);
    }

    public getMetadata() { return process.env.metadata; }

    // ── Private helpers ───────────────────────────────────────────────────

    private buildNodeConfig(
        serviceTypeName: string,
        role: NodeRole,
        overrides: Partial<NodeConfig>,
        replicas: number,
    ): NodeConfig {
        const serviceOverrides = this.services[serviceTypeName] ?? {};
        return {
            ...this.baseNode,
            ...serviceOverrides,
            ...overrides,
            serviceType: serviceTypeName,
            role,
            replicas,
        } as NodeConfig;
    }

    private requireOrchestrator(caller: string): void {
        if (!this.orchestrator) {
            throw new Error(
                `${caller}() requires mode 'docker' or 'k8s' with a node config. ` +
                `Set { mode, node } in the Cluster constructor.`,
            );
        }
    }
}

export default Cluster;
