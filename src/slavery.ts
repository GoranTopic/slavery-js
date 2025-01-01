/* this class is the entry point for slavery program
 * it handle both the low lever process cluster and the high lever socket client
 * the low level cluster is handled with many process in the same computer, or diffrent computer
 * while the high lever service client is handled with socket.io server client aquitecture.
 */
import Cluster from './cluster';
import { 
    Service,
    Primary,
    Master, 
    //Logger, 
    //Proxies, 
    //Storage, 
} from './services';
import { Slaves, nodesHandler } from './nodes';
import { findLocalIpOnSameNetwork } from './utils';

// this type solely exits to make an annotation for the Sevices and nodes
type ServiceInheritor<T extends Service> = new (...args: any[]) => T;
type NodeConstructor<T extends Node> = new (...args: any[]) => T;

// This is the class that will be called when intiated
class Slavery {
    // this are the services used
    private master: Function | undefined;
    private logger: Function | undefined;
    private proxies: Function | undefined;
    private storage: Function | undefined;
    private primary: Function | undefined;
    private slaves: Function | undefined;
    private pipes: Function | undefined;
    private cluster: Cluster; 
    // list of services
    private services: string[];
    // options
    private options: any;
    private host: string;
    private port: number;
    // primary network
    private primaryNetwork: Primary;
    
    constructor(options: any) {
        // handle options
        this.options = options;
        this.host = options.host;
        this.port = options.port;
        // list of services
        this.services = [ 
            'master', 
            //'logger', 
            //'proxies', 
            //'storage', 
        ] 
        // make cluster_handler
        this.cluster = new Cluster(this.options);
        // create a primary network service
        this.primaryNetwork = new Primary({
            host: this.host,
            port: this.port,
            listOfServices: this.services,
            options: this.options.primary
        });
        // check if there is a primary network on the passed host and port
        this.primaryNetwork.checkService().then((ps: Boolean) => {
            if(ps) // if we can find it then we will connect to it
                this.primaryNetwork.connect();
            else // if we can't find it then we will create a new primary network
                this.primaryNetwork.createService();
        });
        // register possible services and nodes into this object
        this.master = this.initialize_service('master', Master, this.options.master);
        //this.logger = this.initialize_service('logger', Logger, this.options.logger);
        //this.proxies = this.initialize_service('proxies', proxies, this.options.proxies);
        //this.storage = this.initialize_service('storage', Storage, this.options.storage);
        this.slaves = this.initialize_nodes('slaves', Slaves, this.options.slaves);
        //this.pipes = this.initialize_nodes('pipes', Pipes, this.options.pipes);
    }

    private initialize_service(service_name: string, service: ServiceInheritor<Service>, options: any) {
        // return a function with a function which takes a callback
        return async (service_callback: Function) => {
            // make a single new process on the cluster
            this.cluster.spawn(service_name);
            // make sure that only the correct process run the function
            if(this.cluster.is(service_name)) {
                // await until this.primaryNetwork is ready
                await this.primaryNetwork.isReady();
                // get the port form the same network as the primary network
                let host = findLocalIpOnSameNetwork(this.primaryNetwork.host);
                // create service, 0 means a random port
                let s = new service({ host, port: 0, options });
                // initilize service 
                await s.createService();
                // register sevice to primary network
                await this.primaryNetwork.register_service(s);
                // get all of the sevices, 
                let service_addresses = await this.primaryNetwork.get_services();
                // for each create a service info create a client that connects to it
                let services = await Promise.all(
                    service_addresses.map(async (service:any) => 
                        await this.connectService({ ...service, process: 'service' })
                    )
                );
                // initilize service connected it into the network
                let nodes = nodesHandler(s.network);
                // run the process callback
                await service_callback({ ...services, nodes }).bind(s);
            }
        }
    }


    private initialize_nodes(nodes_name: string, node: NodeConstructor<Node>, options: any) {
        // make a new process from the callback
        return async (node_callback: Function) => {
            // make mnay new processes as the number of nodes
            this.cluster.spawn(nodes_name, this.options[nodes_name]?.number)
            if(this.cluster.is(nodes_name)) {
                // await until this.primaryNetwork is ready
                await this.primaryNetwork.isReady();
                // get all of the sevices, 
                let service_addresses = await this.primaryNetwork.get_services();
                // for each create a service info create a client that connects to it
                let services = await Promise.all(
                    service_addresses.map( async (service: any) => 
                        await this.connectService({ ...service, process: 'node' }
                    )
                )
                // get the list of services from the primary network 
                let n = new node(options);
                // run the node callback
                await node_callback({ ...services }).bind(n);
            }
        }
    }

    
    /* initliaze the connection to the service node */
    private async connectService({ name, type, host, port }: any){
        // create a new service client
        let s = new Service({ name, type, host, port });
        // connect to the service
        await s.connect();
        // return the service client
        return s;
    };


}

export default Slavery
