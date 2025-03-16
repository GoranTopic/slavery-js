import Network, { Listener, Connection } from '../network';
import { NodeManager, Node } from '../nodes';
import Cluster from '../cluster';
import RequestQueue from './RequestQueue';
import ServiceClient from './ServiceClient';
import { toListeners, log } from '../utils';
import type { ServiceAddress, SlaveMethods, Request, Options } from './types';
import { serializeError } from 'serialize-error';
import getPort from 'get-port';

// the paramer the service will take
type Parameters = {
    // the name of the service
    service_name: string,
    // the address of the service will take
    peerServicesAddresses: ServiceAddress[],
    // the master callback that will be called by the master process
    mastercallback?: (...args: any[]) => any,
    // the slave callbacks that will be called by the slaves
    slaveMethods?: SlaveMethods,
    // the options that will be passed to the service
    options: Options
};

class Service {
    /* This will be the based class for the service which salvery will call to create proceses */
    public name: string;
    public host: string;
    public port: number;
    private nodes?: NodeManager;
    public nm_host: string;
    public nm_port: number;
    public requestQueue: RequestQueue | null = null;
    public number_of_nodes: number;
    private masterCallback?: (...args: any[]) => any;
    private slaveMethods: SlaveMethods;
    private peerAddresses: ServiceAddress[];
    private cluster?: Cluster;
    private network?: Network;
    private options: Options;

    constructor(params: Parameters) {
        this.name = params.service_name;
        // the address of the service will take
        this.host = params.options.host || 'localhost';
        this.port = params.options.port || 0;
        // the host of the node manager
        this.nm_host = params.options.nm_host || 'localhost';
        this.nm_port = params.options.nm_port || 0;
        // the call that will run the master process
        this.masterCallback = params.mastercallback || undefined;
        // the method that we will use ont he slave
        this.slaveMethods = params.slaveMethods || {};
        // other sevices that we conenct to
        this.peerAddresses = params.peerServicesAddresses;
        // the options that will be passed to the service
        this.options = params.options;
        // smallest number of processes need to run
        // the master and a slave
        if(this.options.number_of_nodes === undefined)
            this.number_of_nodes = 1;
        else
            this.number_of_nodes = this.options.number_of_nodes;
    }

    public async start() { // this will start the service
        // let initlize the cluster so that we can start the service
        this.cluster = new Cluster(this.options);
        // create a new process for the master process
        this.cluster.spawn('master_' + this.name, {
            allowedToSpawn: true, // give the ability to spawn new processes
            spawnOnlyFromPrimary: true // make sure that only one master process is created
        });
        // run the code for the master process
        if(this.cluster.is('master_' + this.name)) {
            // initialize the master process
            await this.initialize_master();
        }
        // if the cluster is a slave we initialize the process
        if(this.cluster.is('slave_' + this.name)) {
            await this.initialize_slaves();
        }
    }

    private async initialize_master() {
        // initialize the node manager
        log(`[${this.name}] > Service > Initializing node manager`);
        await this.initlize_node_manager();
        // initialize the request queue
        this.initialize_request_queue();
        // initlieze the network and create a service
        this.network = new Network({name: this.name + '_service_network'});
        // get the port for the service
        if(this.port === 0) this.port = await getPort({host: this.host});
        // list the listeners we have for the other services to request
        let listeners = toListeners(this.slaveMethods).map(
            // add out handle request function to the listener
            l => ({ ...l, callback: this.handle_request(l) })
        );
        // add the local service listener
        listeners = listeners.concat(this.getServiceListeners());
        // create the server
        this.network.createServer(this.name, this.host, this.port, listeners);
        // connect to the services
        let connections = await this.network.connectAll(this.peerAddresses);
        // create a service client for the services
        let services = connections.map( (c: Connection) => {
            let name = c.getTargetName();
            if(name === undefined) throw new Error('Service name is undefined');
            return new ServiceClient(name, this.network as Network, this.options);
        }).reduce((acc: any, s: ServiceClient) => {
            acc[s.name] = s;
            return acc;
        }, {})
        // run the callback for the master process
        if(this.masterCallback !== undefined)
            this.masterCallback({ ...services, slaves: this.nodes, master: this });
    }

    private async initialize_slaves() {
        let node = new Node();
        // TODO: Need to find a better way to pass the host and port
        // to the slave process, so far I am only able to pass it through
        // the metadata in the cluster
        // get the nm_host and nm_port from the metadata
        let metadata = process.env.metadata;
        if(metadata === undefined)
            throw new Error('could not get post and host of the node manager, metadata is undefined');
        let { host, port } = JSON.parse(metadata)['metadata'];
        log(`[${this.name}] > Service > connecting to node manager at ${host}:${port}`);
        // connect with the master process
        await node.connectToMaster(host, port);
        // add services to the node
        await node.setServices(this.peerAddresses);
        // read the methods to be used
        node.addMethods(this.slaveMethods)
    }

    private async initlize_node_manager() {
        /* the node manage will be used to conenct to and manage the nodes */
        // if the slave methods is an empty object we will not make any nodes
        if(Object.keys(this.slaveMethods).length === 0)
            return this.nodes;
        // get the port for the node manager
        if(this.nm_port === 0)
            this.nm_port = await getPort({host: this.nm_host});
        // make a node manager
        this.nodes = new NodeManager({
            name: this.name,
            host: this.nm_host,
            port: this.nm_port,
        })
        // spawn the nodes from the node Manager
        await this.nodes.spawnNodes('slave_' + this.name, this.number_of_nodes, {
            metadata: { host: this.nm_host, port: this.nm_port }
        });
        // register the services in the nodes
        await this.nodes.registerServices(this.peerAddresses);
        // get the nodes
        return this.nodes;
    }

    private initialize_request_queue() {
        /* this function will give the request queue all the values an callback it need tow work */
        // if there are no nodes to make don't create a request queue
        if(Object.keys(this.slaveMethods).length === 0)
            return this.nodes;
        // create a new request queue
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
            return result;
        });
    }

    private getServiceListeners() {
        // let add the listeners which we this service will respond
        return [{
            // get number of nodes
            event: '_get_nodes_count',
            callback: () => this.nodes?.getNodeCount()
        },{
            event: '_get_nodes',
            callback: () => this.nodes?.getNodes()
        },{
            event: '_get_idle_nodes',
            callback: () => this.nodes?.getIdle()
        },{
            event: '_get_busy_nodes',
            callback: () => this.nodes?.getBusy()
        },{ // select individual nodes, or groups of nodes
            event: '_select_node',
            callback: () => {
                //TODO: implement this
                return null
            }
        },{
            event: '_select_nodes',
            params: ['node_ids'],
            callback: (node_ids: string[] | string) => {
                //TODO: implement this
                return null
            }
        },{ // spawn or kill a node
            event: '_add_node',
            params: ['number_of_nodes'],
            callback: (number_of_nodes: number) =>
            this.nodes?.spawnNodes('slave_' + this.name, number_of_nodes)
        },{ // kill a node
            event: '_kill_node',
            params: ['node_id'],
            callback: (node_ids: string[] | string | undefined) =>
            (typeof node_ids === 'string' || node_ids === undefined)?
                this.nodes?.killNode(node_ids):
                this.nodes?.killNodes(node_ids)
        },{ // exit the service
            event: '_queue_size',
            callback: () => this.requestQueue?.queueSize()
        },{
            event: '_turn_over_ratio',
            callback: () => this.requestQueue?.getTurnoverRatio()
        },{
            event: 'exit',
            callback: () => this.exit()
        }];
    }


    private handle_request(l: Listener): Function {
        /* this function will take a listener triggered by another a request
         * it will set the request in the  request queue, and return a promise
         * which resolves once the request is processed.
         * the queue will processs the request when it finds an idle node
         * and the node returns the result.
         */
        return async (parameters: any) => {
            if(this.requestQueue === null)
                throw new Error('Request Queue is not defined');
            let promise = this.requestQueue.addRequest({
                method: l.event,
                parameters: parameters,
                completed: false,
                result: null
            });
            // wait until the request is processed
            let result = await promise;
            if(result.isError === true) // if there is an error serialize it
                result.error = serializeError(result.error);
            return result;
        }
    }

    public exit(){
        // exit the service
        log(`[${this.name}] will exit in 1 seconds`);
        setTimeout(() => {
            if(this.nodes !== undefined) this.nodes.exit();
            process.exit(0);
        }, 1000);
        return true
    }
}



export default Service;
