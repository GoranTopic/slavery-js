import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import { fork } from "child_process";
import process from "node:process";
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
    this.type = process.env.type || "primary";
    this.allowedToSpawn = process.env.allowedToSpawn === "true" || false;
    this.spawnOnlyFromPrimary = false;
    this.thisProcess = process;
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
      curProcess = fork(
        process.argv[1],
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
    return process.env.type === process_type;
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
    return process.env.is_child === "true";
  }
  log(message) {
    this.debugging && console.log(`[${process.pid}][${this.type}] ${message}`);
  }
  getMetadata() {
    return process.env.metadata;
  }
}
var ProcessCluster_default = Cluster;
export {
  ProcessCluster_default as default
};
//# sourceMappingURL=ProcessCluster.js.map