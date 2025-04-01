import Network, { Listener, Connection } from '../network';
import Node, { NodeManager } from '../nodes';
import Cluster from '../cluster';
import RequestQueue from './RequestQueue';
import ProcessBalancer from './ProcessBalancer';
import ServiceClient from './ServiceClient';
import Stash from './Stash';
import { toListeners, log, getPort } from '../utils';
import type { ServiceAddress, SlaveMethods, Request, Options } from './types';
import { serializeError } from 'serialize-error';

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
    private stash: Stash = new Stash();
    private processBalancer?: ProcessBalancer | null = null;
    private requestQueue: RequestQueue | null = null;
    public nm_host: string;
    public nm_port: number;
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
        if(this.options.number_of_nodes === undefined){
            this.number_of_nodes = 1;
            if(this.options.auto_scale === undefined)
                this.options.auto_scale = true;
        }else{
            this.number_of_nodes = this.options.number_of_nodes;
            if(this.options.auto_scale === undefined)
                this.options.auto_scale = false
        }
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
        // initilze the process balancer
        this.initialize_process_balancer();
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
            this.masterCallback({ ...services, slaves: this.nodes, master: this, self: this });
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
        if(Object.keys(this.slaveMethods).length === 0) return null;
        // get the port for the node manager
        if(this.nm_port === 0)
            this.nm_port = await getPort({host: this.nm_host});
        // make a node manager
        this.nodes = new NodeManager({
            name: this.name,
            host: this.nm_host,
            port: this.nm_port,
            stash: this.stash, // set the stash
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
        if(Object.keys(this.slaveMethods).length === 0) return null
            // if node manager is not defined throw an error
            if(this.nodes === undefined) throw new Error('Node Manager is not defined');
            // create a new request queue
            this.requestQueue = new RequestQueue({
                // we pass the functions that the request queue will use
                get_slave: this.nodes.getIdle.bind(this.nodes),
                process_request: 
                    async (node: Node, request: Request) => await node.run(request.method, request.parameters)
            });
    }

    private initialize_process_balancer() {
        /* this function will initialize the process balancer */
        if(Object.keys(this.slaveMethods).length === 0) return null;
        // if the auto scale is true we will create a process balancer
        if(this.options.auto_scale === true){
            this.processBalancer = new ProcessBalancer({
                // pass the functions need for the balancer to know the hwo to balance
                checkQueueSize: this.requestQueue?.queueSize.bind(this.requestQueue),
                checkSlaves: () => ({ idleCount: this.nodes?.getIdleCount(), workingCount: this.nodes?.getBusyCount() }),
                addSlave: () => this.nodes?.spawnNodes( 'slave_' + this.name, 1, { metadata: { host: this.nm_host, port: this.nm_port } }),
                removeSlave: () => this.nodes?.killNode()
            });
        }
    }


    private getServiceListeners() {
        // let add the listeners which we this service will respond
        // lets ignore the selector field
        let listeners = [{
            // get number of nodes
            event: '_get_nodes_count',
            callback: () => ({ result: this.nodes?.getNodeCount() })
        },{
            event: '_get_nodes',
            callback: () => this.nodes?.getNodes().map((n: Node) => ({ status: n.status, id: n.id }))
        },{
            event: '_get_idle_nodes', // wee need to filter this array of objects
            callback: () => ({ result: this.nodes?.getIdleNodes() })
        },{
            event: '_get_busy_nodes', // this one too
            callback: () =>({ result: this.nodes?.getBusyNodes() })
        },{
            event: '_number_of_nodes_connected',
            params: ['node_num'],
            callback: async (node_num: number) => await this.nodes?.numberOfNodesConnected(node_num)
        },{ // select individual nodes, or groups of nodes
            event: '_select',
            params: ['node_num'],
            callback: async (node_num: number) => {
                // get the idle nodes 
                let nodes = this.nodes?.getNodes().map((n: Node) => n.id);
                if(nodes === undefined) return { isError: true, error: serializeError(new Error('Nodes are undefined')) }
                // if the number of nodes is greater than the number of nodes we have
                if(node_num > nodes.length) return { isError: true, error: serializeError(new Error('Not enough nodes')) }
                // select the nodes
                let selected_nodes = nodes.slice(0, node_num);
                // return the selected nodes
                return { result: selected_nodes }
            }
        },{ // spawn or kill a node
            event: '_add_node',
            params: ['number_of_nodes'],
            callback: (number_of_nodes: number) =>
            ({ result: this.nodes?.spawnNodes(
                'slave_' + this.name,
                number_of_nodes,
                { metadata: { host: this.nm_host, port: this.nm_port } }
            ) })
        },{ // kill a node
            event: '_kill_node',
            params: ['node_id'],
            callback: async(node_ids: string[] | string | undefined | number) => {
                let res;
                if(node_ids === undefined){
                    res = await this.nodes?.killNode();
                }else if(typeof node_ids === 'string'){
                    res = await this.nodes?.killNode(node_ids);
                }else if(typeof node_ids === 'number'){
                    for(let i = 0; i < node_ids; i++) await this.nodes?.killNode();
                }else if(node_ids.length === 0){
                    res = await this.nodes?.killNode();
                }else if(node_ids.length >= 1){
                    res = await this.nodes?.killNodes(node_ids);
                }else {
                    return { isError: true, error: serializeError(new Error('Invalid node id')) }
                }
                return ({result: res});
            }
        },{ // exit the service
            event: '_queue_size',
            callback: () => ({ result: this.requestQueue?.queueSize() })
        },{
            event: '_turn_over_ratio',
            callback: () => ({ result: this.requestQueue?.getTurnoverRatio() })
        },{
            event: 'exit',
            callback: () => ({ result: this.exit() })
        }];
        // get only the paramters, diregar the rest
        return listeners.map(l => {
            return { ...l, callback: ({ parameters }: any) => l.callback(parameters) }
        });
    }

    private handle_request(l: Listener): Function {
        /* this function will take a listener triggered by another a request
         * it will set the request in the  request queue, and return a promise
         * which resolves once the request is processed.
         * the queue will processs the request when it finds an idle node
         * and the node returns the result. */
        return async (data: any) => {
            if(this.requestQueue === null)
                throw new Error('Request Queue is not defined');
            let promise = this.requestQueue.addRequest({
                method: l.event,
                parameters: data.parameters,
                selector: data.selector,
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
        //log(`[${this.name}] will exit in 1 seconds`);
        setTimeout(() => {
            // first we close the ProcessBalancer if we have one
            if(this.processBalancer) this.processBalancer.exit();
            // request queue will be closed
            if(this.requestQueue) this.requestQueue.exit();
            // then we close the nodes Manager
            if(this.nodes) this.nodes.exit();
            // then we close the connections we have,
            if(this.network) this.network.close();
            // lastly we close ourselves, how sad
            process.exit(0);
        }, 1000);
        return true
    }

    public set = async (key: any, value: any = null) => {
        await this.stash.set(key, value);
    }

    public get = async (key: string = '') =>
        await this.stash.get(key);
    
}



export default Service;
