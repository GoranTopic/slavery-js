import { await_interval, Queue, log } from '../utils';
import { Request } from './types';

class RequestQueue {
    /* This class will keep track of all the requests that are made to the service,
     * how long each request takes to be processed,
     * how many requests are in the queue,
     * when the requests are being processed, and
     * request individually.
     */

    private queue: Queue<Request> = new Queue();
    private process_request: Function;
    private get_slave: Function;
    private isRunning: boolean = false;
    private interval: NodeJS.Timeout;
    private heartbeat = 100; // Check every 100ms if the request is completed
    private turnover_times: number[] = []; // Stores time taken for the last 500 requests
    private MAX_TURNOVER_ENTRIES = 500; // Limit storage to last 500 requests

    constructor({ process_request, get_slave }: { process_request: Function, get_slave: Function }) {
        /*
         * Set an interval to check if there are items in the queue.
         * If there are, pop the first element and process it.
         * If there are no elements, wait for the next element to be added.
         */
        // set functions
        this.process_request = process_request;
        this.get_slave = get_slave;
        if (!this.process_request) throw new Error('Process request cannot be null');
        if (!this.get_slave) throw new Error('Get slave cannot be null');
        // run interval
        this.interval = setInterval(async () => {
            // do not run another function if the previous one is still running
            if (this.isRunning) return;
            // if there are no items in the queue
            if (this.queue.size() === 0) { 
                this.isRunning = false;
                return;
            }
            // start the request function
            this.isRunning = true;
            // get the first request from queue
            let request = this.queue.pop();
            // get a slave to process the request
            const slave = await this.get_slave();
            // process the request
            let startTime = Date.now();
            let endTime : number;
            // set running as false
            this.isRunning = false;
            // process the request
            this.process_request(slave, request).then(
                (result: any) => { // record the time
                    endTime = Date.now();
                    // add values to the request
                    if(request === false) throw new Error('Request is null... now what?');
                    request.completed = true;
                    request.result = result;
                    // Track the time taken for this request
                    const timeTaken = endTime - startTime;
                    console.log(`[RequestQueue] Request completed in ${timeTaken}ms`);
                    this.turnover_times.push(timeTaken);
                    // Keep only the last 500 entries
                    if (this.turnover_times.length > this.MAX_TURNOVER_ENTRIES) 
                        this.turnover_times.shift(); // Remove the oldest entry
                }
            ).catch((err : any) => {
                console.error('[RequestQueue] Request failed to complete');
                console.error(err);
                return err;
            });
        }, 100);
    }

    public addRequest(request: Request): Promise<any> {
        // Add request to the queue and return a promise
        // that will be resolved when the request is completed
        return new Promise(async (resolve, reject) => {
            this.queue.push(request);
            // Wait until the request is completed, or 60 minutes
            await await_interval(() => {
                log(request);
                return request.completed === true;
            }, 60 * 60 * 1000, this.heartbeat)
            .catch(err => {
                console.error('[RequestQueue] Request failed to complete');
                console.error(err);
                reject(err)
            });
            // Resolve the promise with the result of the request
            resolve(request.result);
        });
    }

    public queueSize() : number {
        return this.queue.size();
    }

    public getTurnoverRatio(): number {
        if (this.turnover_times.length === 0) return 0;
        const sum = this.turnover_times.reduce((acc, time) => acc + time, 0);
        return sum / this.turnover_times.length;
    }

    public exit() {
        clearInterval(this.interval);
    }
}

export default RequestQueue;
