import cluster from 'node:cluster';
import process from 'node:process';


class Cluster {
    numberOfProcesses: number;
    process_timeout: number;
    crash_on_error: boolean;
    thisProcess: any;
    processes: any[];

    constructor(options:any) {
        this.numberOfProcesses = options.numberOfProcesses || null;
        this.process_timeout = options.process_timeout || null;
        this.crash_on_error = options.crash_on_error || false;
        this.thisProcess = process;
        this.processes = [];
        cluster.setupPrimary({
            silent: true,
        });
    }

    public spawn(
        process_type: string, 
        numberOfSpawns: number = 1
    ){
        if (!cluster.isPrimary) return;
        let curProcess;
        process.env.type = process_type;
        for (let i = 0; i < numberOfSpawns; i++){
            curProcess = cluster.fork({ type: process_type, })
            this.processes.push(curProcess);
        }
        process.env.type = 'primary';
    }

    get_this_process() {
        return this.thisProcess;
    }


    get_processes() {
        return this.processes;
    }

    is(process_type: string) {
        if(process_type === 'primary') return cluster.isPrimary;
        return process.env.type === process_type;
    }

    get_workers() {
        return cluster.workers;
    }
}

export default Cluster;
