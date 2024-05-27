import cluster from 'node:cluster';

class Api {
    /* this class provice an interface for sending and reciving messages 
     * between the master process and the primary process 
     * it is usefull for providing an easy way to manage the cluster and the infomation that */
    constructor(process, cluster) {
        this.masterProcess = process;
        this.cluster = cluster;
    }

    onSuccess(){
    };

    onError(){
    };

    async getWorkers() {
        // return a list of workers in the cluster
        let workers  = cluster.workers;
        let workersList = Object.keys(workers)
            .map((key) => ({
                id : workers[key].id, 
                pid: workers[key].process.pid,
                state: workers[key].state,
                type: workers[key].type,
            }));
        return workersList;
    }

    async getSlaves() {
        // return a list connected to the master process
        let msg = 'getNumberOfSlaves';
        let res = await this._query_master(msg);
        return res;
    }

    async slavesConnected(number=1) {
        await this._query_master('awaitSlavesConnected', number);
    }

    async spawnSlave(number=1) {
        // this function will make a new worker process in the cluster,
        // this worker will read the file and run the functions to become a salve
        await Promise.all(
            Array(number).fill().map(async () => {
                process.env.type = 'slave';
                // make slave process
                let worker = cluster.fork({ type: 'slave' });
                // set listerner for master process exit
                worker.type = 'slave';
                // set type to primary again
                process.env.type = 'primary';
                // wait until slave is connected
                await new Promise((resolve, reject) => {
                    setInterval(() => {
                        if(worker.isConnected()) {
                            resolve();
                        }
                    }, 10);
                })
            })
        );
    }
    
    async killWorker(id=null){
        // if id is null kill the first worker that is not a slave
        if( id == null ){
            let workers = await this.getWorkers();
            // filter out worker type master
            workers = workers.filter( worker => worker.type !== 'master');
            //if there workers kill the first one
            id = workers.length > 0 ? workers[0].id : null;
        } 
        // kill the worker
        cluster.workers[id].kill();
        // check until worker is killed
        await new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                if(cluster.workers[id] === undefined) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
        return;
    }


    async killSlave(id=null) {
        // this function will kill a worker process in the cluster
        if(id === null) { // if no id is given kill first slave
            let workers = await this.getSlaves();
            for (var id in workers) {
                workers[id].kill();
            }
        } else {
            cluster.workers[id].kill();
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async pingMaster() {
        let result = await this._query_master('areYouMaster?');
        return result === 'I am master';
    }

    async exit () {
        for (var id in cluster.workers) 
            cluster.workers[id].kill();
        // exit the master process
        process.exit(0);
    }


    async _query_master(msg, payload=null) {
        // this function will send a mesage to the maaster process which will in turn 
        // get the  resposnese from the Master class instance
        return await new Promise((resolve, reject) => {
            // reject on timeout
            setTimeout(() => { reject('timeout'); }, 5000);
            this.masterProcess.on('message', response => {
                resolve(response);
            })
            this.masterProcess.send({ msg, payload });
        }).catch((err) => {
            console.log(err);
        });
    }

}


export default Api;
