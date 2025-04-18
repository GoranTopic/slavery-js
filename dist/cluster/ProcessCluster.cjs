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
class Cluster {
  constructor(options) {
    __publicField(this, "numberOfProcesses");
    __publicField(this, "process_timeout");
    __publicField(this, "crash_on_error");
    __publicField(this, "thisProcess");
    __publicField(this, "type");
    __publicField(this, "processes");
    __publicField(this, "allowedToSpawn");
    __publicField(this, "spawnOnlyFromPrimary");
    __publicField(this, "debugging");
    this.numberOfProcesses = options.numberOfProcesses || null;
    this.process_timeout = options.process_timeout || null;
    this.crash_on_error = options.crash_on_error || false;
    this.debugging = options.debugging || false;
    this.type = import_node_process.default.env.type || "primary";
    this.allowedToSpawn = import_node_process.default.env.allowedToSpawn === "true" || false;
    this.spawnOnlyFromPrimary = false;
    this.thisProcess = import_node_process.default;
    this.processes = [];
  }
  spawn(process_type, {
    numberOfSpawns,
    allowedToSpawn,
    spawnOnlyFromPrimary,
    metadata
  } = {}) {
    this.log("Spawning new process " + process_type);
    this.log(`allowedToSpawn: ${allowedToSpawn}`);
    this.log("this.amIThePrimaryProcess(): " + this.amIThePrimaryProcess());
    if (numberOfSpawns === void 0) numberOfSpawns = 1;
    this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
    if (this.amIThePrimaryProcess() && allowedToSpawn) allowedToSpawn = true;
    else allowedToSpawn = false;
    this.log("final passing on allowedToSpawn " + allowedToSpawn);
    if (this.isProcessAllowedToSpawn() === false) return;
    let curProcess;
    for (let i = 0; i < numberOfSpawns; i++) {
      curProcess = (0, import_child_process.fork)(
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
      this.processes.push(curProcess);
    }
  }
  isProcessAllowedToSpawn() {
    if (this.spawnOnlyFromPrimary && this.amIChildProcess())
      return false;
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
    if (this.thisProcess.env.is_child === void 0)
      return true;
    if (this.thisProcess.env.is_child === null)
      return true;
    if (this.thisProcess.env.is_child === "false")
      return true;
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
}
var ProcessCluster_default = Cluster;
//# sourceMappingURL=ProcessCluster.cjs.map