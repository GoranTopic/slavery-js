import type { Request } from './types';
declare class RequestQueue {
    private queue;
    private process_request;
    private get_slave;
    private isRunning;
    private interval;
    private heartbeat;
    private turnover_times;
    private MAX_TURNOVER_ENTRIES;
    constructor({ process_request, get_slave }: {
        process_request: Function;
        get_slave: Function;
    });
    addRequest(request: Request): Promise<any>;
    queueSize(): number;
    getTurnoverRatio(): number;
    exit(): void;
}
export default RequestQueue;
