"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var ProcessCluster_exports = {};
__export(ProcessCluster_exports, {
  default: () => ProcessCluster_default
});
module.exports = __toCommonJS(ProcessCluster_exports);
var import_child_process = require("child_process");
var import_node_process = __toESM(require("node:process"), 1);
var import_DockerOrchestrator = require("./orchestration/DockerOrchestrator.js");
var import_K8sOrchestrator = require("./orchestration/K8sOrchestrator.js");
class Cluster {
  constructor(options) {
    // ── Existing local-mode fields (unchanged) ────────────────────────────
    __publicField(this, "numberOfProcesses");
    __publicField(this, "process_timeout");
    __publicField(this, "crash_on_error");
    __publicField(this, "thisProcess");
    __publicField(this, "type");
    __publicField(this, "processes");
    __publicField(this, "allowedToSpawn");
    __publicField(this, "spawnOnlyFromPrimary");
    __publicField(this, "debugging");
    __publicField(this, "mode");
    __publicField(this, "orchestrator");
    __publicField(this, "services");
    __publicField(this, "baseNode");
    this.numberOfProcesses = options.numberOfProcesses || null;
    this.process_timeout = options.process_timeout || null;
    this.crash_on_error = options.crash_on_error || false;
    this.debugging = options.debugging || false;
    this.type = import_node_process.default.env.type || "primary";
    this.allowedToSpawn = import_node_process.default.env.allowedToSpawn === "true" || false;
    this.spawnOnlyFromPrimary = false;
    this.thisProcess = import_node_process.default;
    this.processes = [];
    this.mode = options.mode ?? "local";
    this.services = options.services ?? {};
    this.baseNode = options.node;
    if (this.mode === "docker" && options.node) {
      this.orchestrator = new import_DockerOrchestrator.DockerOrchestrator(options.node);
    } else if (this.mode === "k8s" && options.node) {
      this.orchestrator = new import_K8sOrchestrator.K8sOrchestrator(options.node);
    }
  }
  // ── Core spawn ────────────────────────────────────────────────────────
  /**
   * Unified spawn method — preserves the existing local-mode API.
   * In container modes the process_type is used as the service name.
   */
  spawn(process_type, {
    numberOfSpawns,
    allowedToSpawn,
    spawnOnlyFromPrimary,
    metadata
  } = {}) {
    if (this.mode !== "local") {
      const count = numberOfSpawns ?? 1;
      return this.spawnMaster(process_type, {}, count);
    }
    this.log("Spawning new process " + process_type);
    this.log(`allowedToSpawn: ${allowedToSpawn}`);
    this.log("this.amIThePrimaryProcess(): " + this.amIThePrimaryProcess());
    if (numberOfSpawns === void 0) numberOfSpawns = 1;
    this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
    if (this.amIThePrimaryProcess() && allowedToSpawn) allowedToSpawn = true;
    else allowedToSpawn = false;
    this.log("final passing on allowedToSpawn " + allowedToSpawn);
    if (this.isProcessAllowedToSpawn() === false) return;
    for (let i = 0; i < numberOfSpawns; i++) {
      const child = (0, import_child_process.fork)(
        import_node_process.default.argv[1],
        [],
        {
          env: {
            is_child: "true",
            type: process_type,
            allowedToSpawn: `${allowedToSpawn}`,
            metadata: JSON.stringify(metadata)
          }
        }
      );
      this.processes.push(child);
    }
  }
  // ── Hierarchical spawn API ─────────────────────────────────────────────
  /**
   * Deploy the primary node as a persistent Deployment in k8s / container
   * in Docker.  The primary is the root of the hierarchy — it orchestrates
   * masters and stays alive indefinitely.
   *
   * In local mode this is a no-op (the current process IS the primary).
   */
  async spawnPrimary(overrides = {}) {
    if (this.mode === "local") {
      return {
        id: String(import_node_process.default.pid),
        name: "primary",
        role: "primary",
        status: "running",
        createdAt: /* @__PURE__ */ new Date(),
        labels: {}
      };
    }
    this.requireOrchestrator("spawnPrimary");
    const cfg = this.buildNodeConfig("primary", "primary", overrides, 1);
    return this.orchestrator.spawnNode(cfg);
  }
  /**
   * Spawn a persistent master node for the named service.
   *
   * In k8s: creates a Deployment (replicas=count, restarts on failure).
   * In docker: creates a container with RestartPolicy=on-failure.
   * In local: delegates to spawn() (fork).
   *
   * Config is merged: baseNode → services[name] → overrides.
   */
  async spawnMaster(serviceName, overrides = {}, count = 1) {
    if (this.mode === "local") {
      this.spawn(serviceName, { numberOfSpawns: count, allowedToSpawn: true, spawnOnlyFromPrimary: true });
      return [];
    }
    this.requireOrchestrator("spawnMaster");
    const cfg = this.buildNodeConfig(serviceName, "master", overrides, count);
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.orchestrator.spawnNode(cfg));
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
  async spawnProcess(serviceName, overrides = {}) {
    if (this.mode === "local") {
      this.spawn(serviceName, { numberOfSpawns: 1 });
      return { id: "", name: serviceName, role: "process", status: "creating", createdAt: /* @__PURE__ */ new Date(), labels: {} };
    }
    this.requireOrchestrator("spawnProcess");
    const cfg = this.buildNodeConfig(serviceName, "process", overrides, 1);
    return this.orchestrator.spawnNode(cfg);
  }
  // ── Scaling ───────────────────────────────────────────────────────────
  /** Scale master nodes for a named service to exactly `count` replicas. */
  async scaleNodes(count, serviceName) {
    this.requireOrchestrator("scaleNodes");
    return this.orchestrator.scaleNodes(count, serviceName);
  }
  // ── Query / remove ────────────────────────────────────────────────────
  async removeNode(id) {
    this.requireOrchestrator("removeNode");
    return this.orchestrator.removeNode(id);
  }
  async listNodes(role) {
    this.requireOrchestrator("listNodes");
    return this.orchestrator.listNodes(role);
  }
  async close() {
    if (this.orchestrator) await this.orchestrator.close();
  }
  // ── Manifest generation (k8s only) ────────────────────────────────────
  /**
   * Generate a Kubernetes YAML manifest for any node role without
   * touching the API — useful for GitOps or dry-run previews.
   */
  generateManifest(serviceName, role, overrides = {}) {
    const cfg = this.buildNodeConfig(serviceName, role, overrides, 1);
    return import_K8sOrchestrator.K8sOrchestrator.generateManifest(cfg);
  }
  // ── Existing local helpers (unchanged) ────────────────────────────────
  isProcessAllowedToSpawn() {
    if (this.spawnOnlyFromPrimary && this.amIChildProcess()) return false;
    if (this.amIThePrimaryProcess()) {
      this.log("Primary process is allowed to spawn new processes");
      return true;
    } else this.log("Process is not the primary process");
    if (this.allowedToSpawn) {
      this.log("Process is allowed to spawn new processes");
      return true;
    } else this.log("Process is not allowed to spawn new processes");
    return false;
  }
  get_this_process() {
    return this.thisProcess;
  }
  get_processes() {
    return this.processes;
  }
  is(process_type) {
    this.log(`checking if is process ${process_type}`);
    if (process_type === "primary") return this.amIThePrimaryProcess();
    return import_node_process.default.env.type === process_type;
  }
  amIThePrimaryProcess() {
    if (this.thisProcess.env.is_child === void 0) return true;
    if (this.thisProcess.env.is_child === null) return true;
    if (this.thisProcess.env.is_child === "false") return true;
    return false;
  }
  isPrimary() {
    return this.amIThePrimaryProcess();
  }
  amIChildProcess() {
    return import_node_process.default.env.is_child === "true";
  }
  log(message) {
    this.debugging && console.log(`[${import_node_process.default.pid}][${this.type}] ${message}`);
  }
  getMetadata() {
    return import_node_process.default.env.metadata;
  }
  // ── Private helpers ───────────────────────────────────────────────────
  buildNodeConfig(serviceTypeName, role, overrides, replicas) {
    const serviceOverrides = this.services[serviceTypeName] ?? {};
    return {
      ...this.baseNode,
      ...serviceOverrides,
      ...overrides,
      serviceType: serviceTypeName,
      role,
      replicas
    };
  }
  requireOrchestrator(caller) {
    if (!this.orchestrator) {
      throw new Error(
        `${caller}() requires mode 'docker' or 'k8s' with a node config. Set { mode, node } in the Cluster constructor.`
      );
    }
  }
}
var ProcessCluster_default = Cluster;
//# sourceMappingURL=ProcessCluster.cjs.map