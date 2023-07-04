import Slave from './Slave.js';
import cluster from 'node:cluster';
import process from 'node:process';
import { availableParallelism } from 'node:os';

//import scrap_webpage from './scrap_website.js'  
// cluster is maede to create multiple instance of the Slave intance
class Cluster {
    constructor(options = {}){
        let { endpoint, number } = options
        this.endpoint = endpoint;
        // Start workers and listen for messages containing notifyRequest
        this.number_of_slaves = number ?? availableParallelism();
        // list of slaves
        this.slaves = [];
        this.init();
    }
    init(){
        // create worker with each worker socket io connection
        if (cluster.isPrimary) {
            if(this.number_of_slaves > availableParallelism()) 
                console.error(`number of slaves is greater than available parallelism: ${availableParallelism()}`);
            // make workers
            for(let i = 0; i < this.number_of_slaves; i++) cluster.fork();
            // add event listener to workers
            for(const id in cluster.workers) 
                cluster.workers[id].on('exit', (worker, code, signal) => {
                    console.log(`worker ${worker} died`);
                });
            // add event listener to workers
            for(const id in cluster.workers)
                cluster.workers[id].on('online', () => { console.log(`worker ${id} is online`) });
            // add event listener to workers
        }else
            this.slaves.push( 
                new Slave({
                    endpoint: this.endpoint,
                }) 
            )
    }
}   

export default Cluster;
