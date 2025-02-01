import { Connection } from '../network';
import Service from './Service';
import { Queue } from '../utils';

type Parameters = {
    host: string,
    port: number,
    type?: 'service' | 'client',
    options: any,
}

class Master extends Service {
    /* this is the Master class which will send commands to node on the network */
    private queue: Queue<any>;
    constructor({host, port, type}: Parameters) {
        const name = 'Master';
        super({name, host, port, type});
        this.queue = new Queue<any>();
    }

    public setQueue(values: any[]): void {
        // this function will set the queue
        this.queue = new Queue<any>(values);
    }

    /* function that can be called by a client */

    public async next(): Promise<any> {
        // get the list of services
        return this.queue.next();
    }

    public async add(value: any): Promise<void> {
        // add the value to the queue
        this.queue.enqueue(value);
    }

    public async pop (): Promise<any> { 
        // remove the value from the queue
        return this.queue.dequeue();
    }

}

export default Master;
