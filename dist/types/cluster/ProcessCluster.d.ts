type SpawnOptions = {
    numberOfSpawns?: number;
    allowedToSpawn?: boolean;
    spawnOnlyFromPrimary?: boolean;
    metadata?: any;
};
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
    constructor(options: any);
    spawn(process_type: string, { numberOfSpawns, allowedToSpawn, spawnOnlyFromPrimary, metadata }?: SpawnOptions): void;
    private isProcessAllowedToSpawn;
    get_this_process(): any;
    get_processes(): any[];
    is(process_type: string): boolean;
    private amIThePrimaryProcess;
    isPrimary(): boolean;
    private amIChildProcess;
    private log;
    getMetadata(): string | undefined;
}
export default Cluster;
