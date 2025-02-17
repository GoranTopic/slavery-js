import Network, { Listener, Connection } from '../network';
import { NodeManager, Node } from '../nodes';
import Cluster from '../cluster';
import RequestQueue from './RequestQueue';
import { toListeners } from '../utils';
import { ServiceAddress, SlaveMethods, Request, Options } from './types';
import getPort from 'get-port';

// the paramer the service will take
type Parameters = {
    // the name of the service
    service_name: string,
    // the address of the service will take
    peerServicesAddresses: ServiceAddress[],
    // the master callback that will be called by the master process
    mastercallback: (...args: any[]) => any,
    // the slave callbacks that will be called by the slaves
    slaveMethods: SlaveMethods
    // the options that will be passed to the service
    options: Options
};

class Service {
    /* This will be the based class for the service which salvery will call to create proceses */
    public name: string;
    public host: string = 'localhost';
    public port: number = 0;
    private nodes?: NodeManager;
    public nm_host: string = 'localhost';
    public nm_port: number  = 0;
    public requestQueue: RequestQueue | null = null;
    public number_of_processes: number;
    private masterCallback: (...args: any[]) => any;
    private slaveMethods: SlaveMethods;
    private peerAddresses: ServiceAddress[];
    private cluster?: Cluster;
    private network?: Network;
    private options: Options;


    constructor(params: Parameters) {
        this.name = params.service_name;
        // the call that will run the master process
        this.masterCallback = params.mastercallback;
        // the method that we will use ont he slave
        this.slaveMethods = params.slaveMethods;
        // other sevices that we conenct to
        this.peerAddresses = params.peerServicesAddresses;
        // the options that will be passed to the service
        this.options = params.options;
        // smallest number of processes need to run
        // the master and a slave
        if(!this.options.number_of_processes)
            this.number_of_processes = 2;
        else
            this.number_of_processes = this.options.number_of_processes;
    }


    public async start() { // this will start the service
        // let initlize the cluster so that we can start the service
        this.cluster = new Cluster(this.options);
        // create a new process for the master process
        this.cluster.spawn('master_' + this.name, { allowedToSpawn: true });
        // NOTE: the node manager should spawn the nodes,
        // but before I can make that happend the primary process
        // will spawn the nodes
        //console.log('this.number_of_processes', this.number_of_processes -1);
        //this.cluster.spawn('slave_' + this.name, this.number_of_processes - 1);
        // run the code for the master process
        if(this.cluster.is('master_' + this.name)) {
            console.log('Master Process created');
            // initialize the master process
            await this.initialize_master();
        }
        // if the cluster is a slave we initialize the process
        if(this.cluster.is('slave_' + this.name)) {
            console.log('Slave Process created');
            await this.initialize_slaves();
        }
    }

    private async initialize_master() {
        // initialize the node manager
        await this.initlize_nodeManager();
        // initialize the request queue
        this.initialize_request_queue();
        // TODO: Write the code for getting a request from the server with the defined lieteners
        //  pass the request with the paramter which was send by the other service to the node for processing
        //  get the result or error and send it back
        // initlieze the network and create a service
        this.network = new Network();
        // get the port for the service
        if(this.port === 0)
            this.port = await getPort({host: this.host});
        this.network.createServer(this.name, this.host, this.port, []);
        // register the listeners we have for the other services to request
        let listeners = toListeners(this.slaveMethods).map(
            // add out handle request function to the listener
            l => ({ ...l, callback: this.handle_request(l) })
        );
        this.network.registerListeners(listeners);
        // connect to the services
        await this.network.connectAll(this.peerAddresses);
        // get services address
        let services = this.network.getServices();
        // run the callback for the master process
        this.masterCallback({ ...services, nodes: this.nodes });
    }

    private async initialize_slaves() {
        let node = new Node();
        // connect with the master process
        await node.connectToMaster(this.nm_host, this.nm_port);
        // read the methods to be used
        node.addMethods(this.slaveMethods)
    }

    private async initlize_nodeManager() {
        /* the node manage will be used to conenct to and manage the nodes */
        if(this.nm_port === 0)
            this.nm_port = await getPort({host: this.nm_host});
        // make a node manager
        this.nodes = new NodeManager({
            host: this.nm_host,
            port: this.nm_port,
            number_of_nodes: this.number_of_processes - 1
        })
        // TODO: spawn the nodes from the node Manager
        // await nodes.spawnNodes('slave_' + this.name, this.number_of_processes - 1);
        // <---- need to find a way to spawn the nodes from nodemanager
        // this will give me the ability to manage the node dynamicaly
        // for now the primary process will spawn the nodes
        // register the services in the nodes
        await this.nodes.registerServices(this.peerAddresses);
        return this.nodes;
    }

    private initialize_request_queue() {
        /* this function will give the request queue all the values an callback it need tow work */
        this.requestQueue = new RequestQueue();
        // if node manager is not defined throw an error
        if(this.nodes === undefined) throw new Error('Node Manager is not defined');
        // how do process a request
        this.requestQueue.setProcessRequest( async (request: Request) => {
            if(this.nodes === undefined) throw new Error('Node Manager is not defined');
            // get an idle node from the node manager
            let node = await this.nodes.getIdle();
            // send the request to the node
            let result = await node.run(request.method, request.parameters);
            // return the result
            return result;
        });
        // set when queue has exceeded the size range
        this.requestQueue.setQueueRange({ max: this.options.max_queued_requests || 3, min: 0 });
        this.requestQueue.setOnQueueExceeded(() => {
            // when we have too many request we will make a new node
            //this.nodes?.spawnNode();
        });
    }

    private handle_request(l: Listener): Function {
        /* this function will take a the listener trigger by another service
         * it will set the request in the queue, and return a promise
         * which resolves once the request is processed.
         * the queue will processs the request when it finds an idle node
         * and the node returns the result.
         */
        return async () => {
            if(this.requestQueue === null)
                throw new Error('Request Queue is not defined');
            let promise = this.requestQueue.addRequest({
                method: l.event,
                parameters: l.parameters,
                completed: false,
                result: null
            });
            // wait until the request is processed
            let result = await promise;
            return result;
        }
    }

}


export default Service;
