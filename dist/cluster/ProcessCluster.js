"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const node_process_1 = __importDefault(require("node:process"));
class Cluster {
    numberOfProcesses;
    process_timeout;
    crash_on_error;
    thisProcess;
    type;
    processes;
    allowedToSpawn;
    spawnOnlyFromPrimary;
    debugging;
    constructor(options) {
        this.numberOfProcesses = options.numberOfProcesses || null;
        this.process_timeout = options.process_timeout || null;
        this.crash_on_error = options.crash_on_error || false;
        this.debugging = options.debugging || false;
        this.type = node_process_1.default.env.type || 'primary';
        this.allowedToSpawn = node_process_1.default.env.allowedToSpawn === 'true' || false;
        this.spawnOnlyFromPrimary = false;
        this.thisProcess = node_process_1.default;
        this.processes = [];
    }
    spawn(process_type, { numberOfSpawns, allowedToSpawn, spawnOnlyFromPrimary, metadata } = {}) {
        this.log('Spawning new process ' + process_type);
        this.log(`allowedToSpawn: ${allowedToSpawn}`);
        this.log('this.amIThePrimaryProcess(): ' + this.amIThePrimaryProcess());
        if (numberOfSpawns === undefined)
            numberOfSpawns = 1;
        this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
        // this makes it so that only the primary process can pass the ability to spawn new processes
        // to another process, otherwise there will be an infinite loop
        if (this.amIThePrimaryProcess() && allowedToSpawn)
            allowedToSpawn = true;
        else
            allowedToSpawn = false;
        this.log('final passing on allowedToSpawn ' + allowedToSpawn);
        // check if the process is allowed to spawn new processes
        if (this.isProcessAllowedToSpawn() === false)
            return;
        let curProcess;
        for (let i = 0; i < numberOfSpawns; i++) {
            curProcess = (0, child_process_1.fork)(node_process_1.default.argv[1], [], {
                env: {
                    is_child: 'true',
                    type: process_type,
                    allowedToSpawn: `${allowedToSpawn}`,
                    metadata: JSON.stringify(metadata)
                }
            });
            this.processes.push(curProcess);
        }
    }
    isProcessAllowedToSpawn() {
        if (this.spawnOnlyFromPrimary && this.amIChildProcess())
            return false;
        if (this.amIThePrimaryProcess()) {
            this.log('Primary process is allowed to spawn new processes');
            return true;
        }
        else
            this.log('Process is not the primary process');
        if (this.allowedToSpawn) {
            this.log('Process is allowed to spawn new processes');
            return true;
        }
        else
            this.log('Process is not allowed to spawn new processes');
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
        if (process_type === 'primary')
            return this.amIThePrimaryProcess();
        return node_process_1.default.env.type === process_type;
    }
    amIThePrimaryProcess() {
        if (this.thisProcess.env.is_child === undefined)
            return true;
        if (this.thisProcess.env.is_child === null)
            return true;
        if (this.thisProcess.env.is_child === 'false')
            return true;
        return false;
    }
    isPrimary() {
        return this.amIThePrimaryProcess();
    }
    amIChildProcess() {
        return node_process_1.default.env.is_child === 'true';
    }
    log(message) {
        this.debugging && console.log(`[${node_process_1.default.pid}][${this.type}] ${message}`);
    }
    getMetadata() {
        return node_process_1.default.env.metadata;
    }
}
exports.default = Cluster;
//# sourceMappingURL=ProcessCluster.js.map