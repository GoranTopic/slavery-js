import Network, { Listener, Connection } from '../../network/index.js';
import Cluster from '../../cluster/index.js';
import type { ServiceAddress } from '../../service'
import { log } from '../../utils/index.js';

type Parameters = {
    host: string,
    port: number,
};

class PeerDicoveryServer {
    /* This will be the based class for the service which salvery will call to create proceses */
    public name: string; 
    public host: string;
    public port: number;
    private cluster: Cluster | null = null;
    private network: Network | null = null;
    private services: { [key: string]: ServiceAddress } = {};

    constructor(params: Parameters) {
        this.name = 'peer_discovery';
        // the address of the service will take
        this.host = params.host;
        this.port = params.port;
    }

    public async start() { 
        // let initlize the cluster
        this.cluster = new Cluster({ name: this.name });
        this.cluster.spawn(this.name, {
            spawnOnlyFromPrimary: true // make sure that only one the primary process can spawn this service
        });
        // run the peer discovery service
        if(this.cluster.is('peer_discovery')){
            //log(`starting peer discovery service...`);
            // now we will create the network
            this.network = new Network({name: this.name + '_network'});
            // get the listneres
            let listeners = this.getListeners();
            // create the server
            this.network.createServer(this.name, this.host, this.port, listeners);
        }
        return;
    }

    private getListeners(): Listener[] {
        // this will be the listeners for the peer discovery service
        // this is the eonly traffic that the server will have.
        let listeners = [{
            // get number of nodes
            event: 'register_service',
            params: ['name', 'host', 'port'],
            callback: this.registerService.bind(this)
        },{
            event: 'get_services',
            callback: this.getServices.bind(this)
        },{
            event: 'remove_service',
            params: ['name'],
            callback: this.removeService.bind(this)
        },{ // select individual nodes, or groups of nodes
            event: 'exit',
            callback: this.exit.bind(this)
        }];
        return listeners;
    }

    private registerService({ name, host, port }: ServiceAddress) {
        if(this.network === null) throw new Error('Network is not initialized');
        // check if the service is already registered
        if(this.services[name]) throw new Error(`Service ${name} is already registered`);
        // add the service to the list of services
        this.services[name] = { name, host, port };
        // broadcast the new service to all the nodes
        if(this.network === null) throw new Error('Network is not initialized');
        if(this.network.server === null) throw new Error('Server is not initialized');
        this.network.server.broadcast('new_service', { name, host, port });
        return;
    }

    private getServices() : ServiceAddress[] {
        return Object.values(this.services);
    }

    private removeService(name: string) {
        if(!this.services[name]) return false;
        if(this.network === null) throw new Error('Network is not initialized');
        if(this.network.server === null) throw new Error('Server is not initialized');
        // remove the service from the list of services
        delete this.services[name];
        // broadcast the removal of the service
        this.network.server.broadcast('remove_service', { name });
        return true;
    }


    public exit(){
        //log(`[${this.name}] will exit in 1 seconds`);
        setTimeout(() => {
            if(this.network) this.network.close();
            // lastly we close ourselves, how sad
            process.exit(0);
        }, 1000);
        return true
    }

}



export default PeerDicoveryServer;
