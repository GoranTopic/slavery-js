import Cluster from './cluster';
import { 
    Service,
    //Master, 
    //Logger, 
    //Proxies, 
    //Storage, 
    Primary
} from './services';
import { Slave } from './nodes';

class Slavery {
    private master: Function | undefined;
    private logger: Function | undefined;
    private proxies: Function | undefined;
    private storage: Function | undefined;
    private primary: Function | undefined;
    private slaves: Function | undefined;
    private pipes: Function | undefined;
    private cluster: Cluster; 
    // options
    private options: any;
    private host: string;
    private port: number;
    // primary network
    private primaryNetwork: Primary;

    constructor(options: any) {
        // handle options
        this.options = options;
        this.primary = options.primary;
        this.host = options.host;
        this.port = options.port;
        // make cluster_handler
        this.cluster = new Cluster(this.options);
        // this will try to find the primary service
        //check if there is a primary network on the passed host and port
        // if we can't find it then we will create a new primary network
        this.primaryNetwork = Primary(this.host, this.port);
        this.primaryNetwork.checkService().then((ps: Boolean) => {
            if(ps === false) 
                this.primaryNetwork.createService();
            else 
                this.primaryNetwork.connectService();
        });
        // register possible services and nodes into this object
        this.master = this.initialize_service('master', Master, this.options.master);
        //this.logger = this.initialize_service('logger', Logger, this.options.logger);
        //this.proxies = this.initialize_service('proxies', proxies, this.options.proxies);
        //this.storage = this.initialize_service('storage', Storage, this.options.storage);
        this.slaves = this.initialize_nodes('slaves', Slave, this.options.slaves);
        //this.pipes = this.initialize_nodes('pipes', Pipes, this.options.pipes);
    }

    private initialize_service(service_name: string, service: Service, options: any) {
        // return a function with a function which takes a callback
        return async (service_callback: Function) => {
            // make a single new process on the cluster
            this.cluster.spawn(service_name);
            // make sure that only the correct process run the function
            if(this.cluster.is(service_name)) {
                // await until this.primaryNetwork is ready
                await this.primaryNetwork.isReady();
                // create service
                let s = new service(options);
                // initilize service async
                await s.init();
                // register sevice to primary network
                await this.primaryNetwork.registerService(s);
                // syncronize the service with all other conencted services and nodes
                await this.primaryNetwork.syncronizeService(s);
                // initilize service connected it into the network
                let services = s.get_services();
                let nodes = s.get_nodes();
                // run the process callback
                await service_callback({ ...services, ...nodes }).bind(s);
            }
        }
    }


    private initialize_nodes(nodes_name: string, node: Node, options: any) {
        // make a new process from the callback
        return async (node_callback: Function) => {
            // make mnay new processes as the number of nodes
            this.cluster.spawn(nodes_name, this.options[nodes_name]?.number)
            if(this.cluster.is(nodes_name)) {
                // await until this.primaryNetwork is ready
                await this.primaryNetwork.isReady();
                // get the list of services from the primary network 
                let n = new node(this.options);
                await n.init();
                // syncronize the node with all other services
                await this.primaryNetwork.syncronizeNode(n);
                //  connect to each one of them
                let services = await n.get_services();
                // run the node callback
                await node_callback({ ...services }).bind(n);
            }
        }
    }

}



export default 
