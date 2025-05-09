import type { Request } from './types/index.js';

type RequestQueueOptions = {
    heartbeat?: number;
    requestTimeout?: number; // Timeout for requests
    onError?: 'throw' | 'return' | 'log' | 'ignore';
}

type RequestQueueParameters = {
    process_request: Function;
    get_slave: Function;
    options?: RequestQueueOptions;
}

type addRequestParameters = {
    method: string;
    type: 'run' | 'exec';
    parameters: any;
    selector: string;
}

class RequestQueue {
    /* This class will keep track of all the requests that are made to the service,
     * how long each request takes to be processed,
     * how many requests are in the queue,
     * when the requests are being processed, and
     * request individually.
     */

    private queue: Request[] = [];
    private process_request: Function;
    private currentId: number = 0;
    private get_slave: Function;
    private isIntervalRunning: boolean = false;
    private interval: NodeJS.Timeout;
    private heartbeat;
    private turnover_times: number[] = []; // Stores time taken for the last 500 requests
    private MAX_TURNOVER_ENTRIES = 500; // Limit storage to last 500 requests
    private requestTimeout: number; // Timeout for requests

    constructor({ process_request, get_slave, options }: RequestQueueParameters) {
        /*
         * Set an interval to check if there are items in the queue.
         * If there are, pop the first element and process it.
         * If there are no elements, wait for the next element to be added.
         */
        // process wrapper for maintainig the request
        this.process_request = async (slave: any, request: Request) => {
            let result = await process_request(slave, request);
            return { result, id: request.id }
        }
        this.get_slave = get_slave;
        this.heartbeat = options?.heartbeat || 10;  // Check every 10ms if the request is completed
        this.requestTimeout = options?.requestTimeout || 5 * 60 * 1000; // Default timeout is 5 minutes
        if (!this.process_request) throw new Error('Process request cannot be null');
        if (!this.get_slave) throw new Error('Get slave cannot be null');
        // run interval
        this.interval = setInterval( async () => {
            // do not run another function if the previous one is still running
            if (this.isIntervalRunning) return;
            // if there are no items in the queue
            if (this.queue.length === 0){
                this.isIntervalRunning = false;
                return;
            }
            // start the request function
            this.isIntervalRunning = true;
            // start to look at the queue
            for (let request of this.queue) {
                if(request.completed){
                    // remove the request at the index
                    this.queue = this.queue.filter((r) => r.id !== request.id);
                    request.onComplete();
                    this.isIntervalRunning = false;
                    // get the turnover time
                    this.addTurnOverTime(request.startTime);
                    return;
                }else if(request.isProcessing){
                    // if check if the request has timed out
                    if(Date.now() - request.startTime > this.requestTimeout){
                        request.completed = true;
                        request.result = {
                            isError: true,
                            error: new Error(`slavery-js: Request '${request.method}', timed out after: ${this.requestTimeout}.  You can change this behavior by setting the 'timeout', and 'onError' in the options at slavery({})`),
                        }
                    }
                }else{ // if the is neither completed nor processing
                    request.isProcessing = true;
                    // get slave
                    const slave = await this.get_slave(request.selector);
                    this.isIntervalRunning = false;
                    // process the request
                    this.process_request(slave, request)
                    .then(({ result, id }: { result: any, id: number }) => {
                        let request = this.getRequest(id);
                        if(request){ // complete the request
                            request.completed = true;
                            request.result = result;
                        }
                    })
                    .catch((err : any) => {
                        throw new Error('slavery-js [RequestQueue]: this Error should not be reachable, please report this issue', err);
                    })
                }
            }
            this.isIntervalRunning = false;
        }, this.heartbeat);
    }


    public addRequest( { method, type, parameters, selector }: addRequestParameters ): Promise<any> {
        // Add request to the queue and return a promise
        // that will be resolved when the request is completed
        return new Promise(async resolve => {
            // is id has reached the max value, reset it to 0
            if(this.currentId >= Number.MAX_SAFE_INTEGER) this.currentId = 0;
            let request: Request = {
                id: ++this.currentId,
                method: method,
                type: type,
                parameters: parameters,
                selector: selector || undefined,
                completed: false,
                isProcessing: false,
                onComplete: () => { 
                    resolve(request.result)
                },
                startTime: Date.now(),
                result: null,
            };
            // add the request to the queue
            this.queue.push(request);
        });
    }

    private getRequest(id: number): Request | null {
        // Get request by id
        const request = this.queue.find(r => r.id === id);
        if (request) {
            return request;
        } else {
            return null;
        }
        
    }



    private addTurnOverTime(startTime: number){
        const timeTaken = Date.now() - startTime;
        this.turnover_times.push(timeTaken);
        // Keep only the last 500 entries
        if (this.turnover_times.length > this.MAX_TURNOVER_ENTRIES)
            this.turnover_times.shift(); // Remove the oldest entry
    }


    public queueSize() : number {
        return this.queue.length;
    }

    public getTurnoverRatio(): number {
        if (this.turnover_times.length === 0) return 0;
        const sum = this.turnover_times.reduce((acc, time) => acc + time, 0);
        return sum / this.turnover_times.length;
    }

    public getTurnoverTimes(): number[] {
        return this.turnover_times;
    }

    public exit() {
        this.queue = [];
        clearInterval(this.interval);

    }
}

export default RequestQueue;
