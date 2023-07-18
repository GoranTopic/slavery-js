import Master from './server/Master.js';
import Slave from './client/Slave.js';
import cluster from 'node:cluster';
import process from 'node:process';
import { availableParallelism } from 'node:os';
import log from './utils/log.js';

class Slavery {
    constructor() {
        this.master_process = null;
        this.salve_process = null;
        this.number_of_slaves = null;
    }   

    init( options={} ) {
        this.options = options;
        // separate master and slave options 
        if(cluster.isPrimary){
            // get number of slaves
            let { numberOfSlaves, debug } = options ;
            // if debug is set
            if(debug) process.env.debug = debug ?? false;
            // get available cores
            let available_cores = availableParallelism();
            // if number of slaves is not set
            this.number_of_slaves = numberOfSlaves || available_cores;
            // if number of slaves is more than available cores
            if(this.number_of_slaves > available_cores)
                console.warn(
                    `number of workers is more than available cores, available cores: ${available_cores}`
                );
            // calculate number of slaves
            this._calc_available_cores();
        }
        return this;
    }

    master( callback ) {
        // if it is primary and this function is called
        if (cluster.isPrimary) {
            // calculate number of slaves
            this._calc_available_cores();
            // make master node
            process.env.type = 'master';
            // make master process
            let masterProcess = cluster.fork();
            // set listerner for master process exit
            masterProcess.on('message', msg => {
                if(msg === 'exit') this._exit_all_processes();
            });
            // set type to primary again
            process.env.type = 'primary';
        }
        // if it is the master node and this function is called
        if(process.env.type === 'master') {
            //console.log('master created ', cluster.worker.id)
            // create a master node
            this.master_process = new Master( this.options );
            // run master code
            this.master_process.run(callback);
        }
        // return object
        return this;
    }

    // make slave nodes
    slave( callback ) {
        // if it is primary process and this function is called
        // create node slaves
        if (cluster.isPrimary) {
            // calculate number of slaves
            this._calc_available_cores();
            // make slave nodes
            for(let i = 0; i < this.number_of_slaves; i++){
                // set type to slave
                process.env.type = 'slave';
                // make slave process
                let worker = cluster.fork({ type: 'slave'});
                // set listerner for master process exit
                worker.on('message', msg => {
                    if(msg === 'exit') this._exit_all_processes();
                });
                // set type to primary again
                process.env.type = 'primary';
            }
        }
        // if it is the master node and this function is called
        if(process.env.type === 'slave') {
            //console.log('slave created ', cluster.worker.id)
            // create a master node
            this.salve_process = new Slave( this.options );
            // save the code to be run
            this.salve_process.setCallback(callback);
        }
        return this;
    }

    // calculate number of slaves
    _calc_available_cores() {
        // get number of slaves left
        this.number_of_slaves = this.number_of_slaves - Object.values(cluster.workers).length
    }

    // exit all processes
    _exit_all_processes() {
        // send singal to all workers to exit
        for (var id in cluster.workers) 
            cluster.workers[id].kill();
        // exit the master process
        process.exit(0);
    }

}

function make_slavery ( options={} ){
    // add event listener to workers
    const slavery = new Slavery();
    // initialize
    slavery.init( options );
    // return object
    return slavery;
}

export default make_slavery;
