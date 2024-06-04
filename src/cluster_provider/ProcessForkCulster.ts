import cluster from 'node:cluster';
import process from 'node:process';

class Cluster {
    numberOfProcesses: number;
    process_timeout: number;
    crash_on_error: boolean;
    thisProcess: Process;
    Processes: Process[];

    constructor(options:any) {
        this.numberOfProcesses = options.numberOfProcesses || null;
        this.process_timeout = options.process_timeout || null;
        this.crash_on_error = options.crash_on_error || false;
    }

    public static spawn(
        process_type: string, 
        numberOfSpawns: number = 1
    ){
        if (!cluster.isPrimary) return;
        for (let i = 0; i < numberOfSpawns; i++) {
            process.env.type = process_type;
            cluster.fork({ type: process_type });
        }
    }
}
