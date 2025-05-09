type RequestQueueOptions = {
    heartbeat?: number;
    requestTimeout?: number;
    onError?: 'throw' | 'return' | 'log' | 'ignore';
};
type RequestQueueParameters = {
    process_request: Function;
    get_slave: Function;
    options?: RequestQueueOptions;
};
type addRequestParameters = {
    method: string;
    type: 'run' | 'exec';
    parameters: any;
    selector: string;
};
declare class RequestQueue {
    private queue;
    private process_request;
    private currentId;
    private get_slave;
    private isIntervalRunning;
    private interval;
    private heartbeat;
    private turnover_times;
    private MAX_TURNOVER_ENTRIES;
    private requestTimeout;
    constructor({ process_request, get_slave, options }: RequestQueueParameters);
    addRequest({ method, type, parameters, selector }: addRequestParameters): Promise<any>;
    private getRequest;
    private addTurnOverTime;
    queueSize(): number;
    getTurnoverRatio(): number;
    getTurnoverTimes(): number[];
    exit(): void;
}

export { RequestQueue as default };
