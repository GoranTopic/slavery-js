import Network from '../../network/index.js';
import Cluster from '../../cluster/index.js';
class PeerDicoveryServer {
    /* This will be the based class for the service which salvery will call to create proceses */
    name;
    host;
    port;
    cluster = null;
    network = null;
    services = {};
    constructor(params) {
        this.name = 'peer_discovery';
        // the address of the service will take
        this.host = params.host;
        this.port = params.port;
    }
    async start() {
        // let initlize the cluster
        this.cluster = new Cluster({ name: this.name });
        this.cluster.spawn(this.name, {
            spawnOnlyFromPrimary: true // make sure that only one the primary process can spawn this service
        });
        // run the peer discovery service
        if (this.cluster.is('peer_discovery')) {
            //log(`starting peer discovery service...`);
            // now we will create the network
            this.network = new Network({ name: this.name + '_network' });
            // get the listneres
            let listeners = this.getListeners();
            // create the server
            this.network.createServer(this.name, this.host, this.port, listeners);
        }
        return;
    }
    getListeners() {
        // this will be the listeners for the peer discovery service
        // this is the eonly traffic that the server will have.
        let listeners = [{
                // get number of nodes
                event: 'register_service',
                params: ['name', 'host', 'port'],
                callback: this.registerService.bind(this)
            }, {
                event: 'get_services',
                callback: this.getServices.bind(this)
            }, {
                event: 'remove_service',
                params: ['name'],
                callback: this.removeService.bind(this)
            }, {
                event: 'exit',
                callback: this.exit.bind(this)
            }];
        return listeners;
    }
    registerService({ name, host, port }) {
        if (this.network === null)
            throw new Error('Network is not initialized');
        // check if the service is already registered
        if (this.services[name])
            throw new Error(`Service ${name} is already registered`);
        // add the service to the list of services
        this.services[name] = { name, host, port };
        // broadcast the new service to all the nodes
        if (this.network === null)
            throw new Error('Network is not initialized');
        if (this.network.server === null)
            throw new Error('Server is not initialized');
        this.network.server.broadcast('new_service', { name, host, port });
        return;
    }
    getServices() {
        return Object.values(this.services);
    }
    removeService(name) {
        if (!this.services[name])
            return false;
        if (this.network === null)
            throw new Error('Network is not initialized');
        if (this.network.server === null)
            throw new Error('Server is not initialized');
        // remove the service from the list of services
        delete this.services[name];
        // broadcast the removal of the service
        this.network.server.broadcast('remove_service', { name });
        return true;
    }
    exit() {
        //log(`[${this.name}] will exit in 1 seconds`);
        setTimeout(() => {
            if (this.network)
                this.network.close();
            // lastly we close ourselves, how sad
            process.exit(0);
        }, 1000);
        return true;
    }
}
export default PeerDicoveryServer;
//# sourceMappingURL=PeerDiscoveryServer.js.map