import { await_interval, Queue, log } from '../utils';
import { Request } from './types'

class RequestQueue {
    /* This class will kept track of all the requests that are made to the service, 
     * how long is the request taking to be processed,
     * how many requests are in the queue
     * when are the requests being processed
     * request individualy */

    // Queue of promises
    private queue: Queue<Request> = new Queue();
    private onQueueExceed: Function | null = null;
    // interval to check the queue, pop the first element and process it
    private range: {max: number, min: number} = {max: 0, min: 0};
    private process_request: Function | null = null;
    private interval: NodeJS.Timeout;

    constructor() {
        /*
         * set iterator to check if there are items in the queue
         * if there are, pop the first element and process it
         * if there are no elements, wait for the next element to be added 
         */
        this.interval = setInterval( async () => {
            if (this.queue.size() > 0) {
                let request = this.queue.pop();
                if(!request) throw new Error('Request is null');
                if(!this.process_request) throw new Error('Process request is null');
                // process the request
                log('[RequestQueue] Processing request', request);
                let result = await this.process_request(request);
                request.completed = true;
                request.result = result;
            }
            // check if the queue is greater than the range
            if(this.queueHasExceededRange()) 
                if(this.onQueueExceed) 
                    this.onQueueExceed();
        }, 1);
    }

    public setProcessRequest(process_request: Function) {
        this.process_request = process_request;
    }


    public addRequest(request: Request): Promise<any> {
        // Add request to the queue and return a promise 
        // that will be resolved when the request is completed
        return new Promise( async (resolve, reject) => {
            this.queue.push(request);
            // make an await intervall to check if the request is completed
            await await_interval(() => {
                log(request);
                return request.completed === true
            }, 10000, 100).catch(err => { reject(err) });
            // resolve the promise with the result of the request
            resolve(request.result);
        });
    }

    public setQueueRange({max, min}: {max: number, min: number}) {
        this.range = {max, min};
    }

    // callback to be called when the queue is greater than the range
    public setOnQueueExceeded(c: Function) {
        this.onQueueExceed = c;
    }

    public queueHasExceededRange() {
        return this.queue.size() > this.range.max;
    }

    public exit() {
        clearInterval(this.interval);
    }
    
}


export default RequestQueue;
