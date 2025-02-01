import Network, { Listener, Connection } from '../network';
import NodeManager from '../nodes';
import Cluster from '../cluster';
import { ServiceAddress, SlaveCallbacks, Options } from './types';


// the paramer the service will take
type Parameters = {
    // the name of the service
    service_name: string,
    // the address of the service will take
    servicesAddress: ServiceAddress[],
    // the master callback that will be called by the master process
    Mastercallback: (...args: any[]) => any,
    // the slave callbacks that will be called by the slaves
    SlaveCallbacks: SlaveCallbacks,
    // the options that will be passed to the service
    options: Options
};

class Service {
    /* 
     * This will be the based class for the service which salvery will call to create proceses
     */
    public name: string;
    public host: string;
    public port: number;
    private cluster: Cluster;
    private network?: Network;

    constructor(params: Parameters) {
        this.name = params.service_name;
        this.host = params.options.host || 'localhost';
        this.port = params.options.port || 3030;
        // let initlize the cluster so that we can start the service
        this.cluster = new Cluster(params.options);
        // create a new process for the master process
        this.cluster.spawn('master_' + this.name);
        // run the code for the master process
        if(this.cluster.is('master_' + this.name)) {
            // initlieze the network and create a service
            this.network = new Network();
            this.network.createServer(this.name, this.host, this.port, []);
            // make a node manager
            // run the callback for the master process
            params.Mastercallback(this.network);
            
        }
    }
}


export default Service;
