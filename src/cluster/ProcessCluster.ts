import { fork } from 'child_process';
import process from 'node:process';


type SpawnOptions = {
    numberOfSpawns?: number;
    allowedToSpawn?: boolean;
    spawnOnlyFromPrimary?: boolean;
    metadata?: any;
}

class Cluster {
    numberOfProcesses: number;
    process_timeout: number;
    crash_on_error: boolean;
    thisProcess: any;
    type: string;
    processes: any[];
    allowedToSpawn: boolean;
    spawnOnlyFromPrimary: boolean;
    debugging: boolean;

    constructor(options:any) {
        this.numberOfProcesses = options.numberOfProcesses || null;
        this.process_timeout = options.process_timeout || null;
        this.crash_on_error = options.crash_on_error || false;
        this.debugging = options.debugging || false;
        this.type = process.env.type || 'primary';
        this.allowedToSpawn = process.env.allowedToSpawn === 'true' || false;
        this.spawnOnlyFromPrimary = false;
        this.thisProcess = process;
        this.processes = [];
    }


    public spawn( process_type: string , { numberOfSpawns, allowedToSpawn, spawnOnlyFromPrimary, metadata }: SpawnOptions = {}){
        this.log('Spawning new process ' + process_type);
        this.log(`allowedToSpawn: ${allowedToSpawn}`);
        this.log('this.amIThePrimaryProcess(): ' + this.amIThePrimaryProcess());
        numberOfSpawns = numberOfSpawns || 1;
        this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
        // this makes it so that only the primary process can pass the ability to spawn new processes
        // to another process, otherwise there will be an infinite loop
        if(this.amIThePrimaryProcess() && allowedToSpawn) allowedToSpawn = true;
        else allowedToSpawn = false;
        this.log('final passing on allowedToSpawn ' + allowedToSpawn)
        // check if the process is allowed to spawn new processes
        if(this.isProcessAllowedToSpawn() === false) return;
        let curProcess;
        for (let i = 0; i < numberOfSpawns; i++){
            curProcess = fork(
                process.argv[1], [], {
                    env: {
                        is_child: 'true',
                        type: process_type,
                        allowedToSpawn: `${allowedToSpawn}`,
                        metadata: JSON.stringify(metadata)
                    }
                }
            )
            this.processes.push(curProcess);
        }
    }


    private isProcessAllowedToSpawn(){
        if(this.spawnOnlyFromPrimary && this.amIChildProcess()) 
            return false;
        if(this.amIThePrimaryProcess()){
            this.log('Primary process is allowed to spawn new processes');
            return true;
        }else this.log('Process is not the primary process');
        if(this.allowedToSpawn){
            this.log('Process is allowed to spawn new processes');
            return true;
        }else this.log('Process is not allowed to spawn new processes');
        return false;
    }


    get_this_process() {
        return this.thisProcess;
    }


    get_processes() {
        return this.processes;
    }

    public is(process_type: string) {
        this.log(`checking if is process ${process_type}`);
        if(process_type === 'primary') return this.amIThePrimaryProcess();
        return process.env.type === process_type;
    }

    private amIThePrimaryProcess() {
        if (this.thisProcess.env.is_child === undefined)
            return true;
        if(this.thisProcess.env.is_child === null)
            return true;
        if (this.thisProcess.env.is_child === 'false')
            return true;
        return false;
    }

    public isPrimary() {
        return this.amIThePrimaryProcess();
    }

    private amIChildProcess() {
        return process.env.is_child === 'true';
    }

    private log(message: string) {
        this.debugging && console.log(`[${process.pid}][${this.type}] ${message}`);
    }

    public getMetadata() {
        return process.env.metadata;
    }

}

export default Cluster;
