import cluster from 'node:cluster';

class Api {
    /* this class provice an interface for sending and reciving messages between the master process and the primary process 
     * it is usefull for providing an easy way to manage the cluster and the infomation that */

    constructor(process, cluster) {
        this.masterProcess = process;
        this.cluster = cluster;
    }

    async pingMaster() {
        // this function will send a mesage to the maaster process which will in turn 
        // get the  resposnese from the Master class instance
        return await new Promise((resolve, reject) => {
            // reject on timeout
            setTimeout(() => { reject('timeout'); }, 5000);
            let msg = 'areYouMaster?';
            this.masterProcess.on('message', (msg) => {
                resolve(msg === 'I am master');
            })
            this.masterProcess.send({ msg });
        });
    }

    async exit () {
        for (var id in cluster.workers) 
            cluster.workers[id].kill();
        // exit the master process
        process.exit(0);
    }

}


export default Api;

