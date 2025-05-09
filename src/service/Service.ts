import Network, { Listener, Connection } from '../network/index.js';
import Node, { NodeManager } from '../nodes/index.js';
import Cluster from '../cluster/index.js';
import { PeerDiscoveryClient } from '../app/peerDiscovery/index.js';
import RequestQueue from './RequestQueue.js';
import ProcessBalancer from './ProcessBalancer.js';
import ServiceClient from './ServiceClient.js';
import Stash from './Stash.js';
import { toListeners, log, getPort, isServerActive, execAsyncCode, await_interval } from '../utils/index.js';
import type { ServiceAddress, SlaveMethods, Request, Options } from './types/index.js';
import { serializeError } from 'serialize-error';

// the paramer the service will take
type Parameters = {
    // the name of the service
    service_name: string,
    // the address of the service will take
    peerServicesAddresses?: ServiceAddress[],
    // the adderess of the peer discovery service used to find the other services
    peerDiscoveryAddress?: { host: string, port: number },
    // the master callback that will be called by the master process
    mastercallback?: (...args: any[]) => any,
    // the slave callbacks that will be called by the slaves
    slaveMethods?: SlaveMethods,
    // the options that will be passed to the service
    options?: Options
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
    private peerDiscoveryAddress?: { host: string, port: number };
    private peerDiscovery?: PeerDiscoveryClient;
    private cluster?: Cluster;
    private network?: Network;
    private options: Options;
    private servicesConnected: boolean = false;

    constructor(params: Parameters) {
        this.name = params.service_name;
        // the address of the service will take
        this.host = params.options?.host || 'localhost';
        this.port = params?.options?.port || 0;
        // the host of the node manager
        this.nm_host = params.options?.nm_host || 'localhost';
        this.nm_port = params.options?.nm_port || 0;
        // the call that will run the master process
        this.masterCallback = params.mastercallback || undefined;
        // the method that we will use ont he slave
        this.slaveMethods = params.slaveMethods || {};
        // other sevices that we conenct to
        this.peerAddresses = params.peerServicesAddresses || [];
        // the peer discovery service
        this.peerDiscoveryAddress = params.peerDiscoveryAddress || undefined;
        this.peerDiscovery = undefined;
        // if both the peerAddresses and the peerDiscoveryServiceAddress are not defined,
        // we will throw an error
        if(this.peerAddresses === undefined && this.peerDiscoveryAddress === undefined)
            throw new Error('Peer Addresses or Peer Discovery Service Address must be defined');
        // the options that will be passed to the service
        this.options = params.options || {};
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
        // initialize the master and all the services
        // get the port for the service
        if(this.port === 0) this.port = await getPort({host: this.host});
        // if we have a peer discovery service we will try to connect to it
        if(this.peerDiscoveryAddress !== undefined) await this.handle_peer_discovery();
        log('peer addresses', this.peerAddresses);
        //console.log(`[${this.name}] > initialize_master peer addresses`, this.peerAddresses);
        // initialize the node manager
        //console.log(`[${this.name}] > initialize_master node manager`);
        await this.initlize_node_manager();
        //console.log(`[${this.name}] > initialize_master node manager done`);
        // initialize the request queue
        //console.log(`[${this.name}] > initialize_master request queue`);
        this.initialize_request_queue();
        //console.log(`[${this.name}] > initialize_master request queue done`);
        // initlieze the network and create a service
        //console.log(`[${this.name}] > initialize_master network`);
        this.network = new Network({
            name: this.name + '_service_network',
            options: {
                timeout: this.options.timeout,
            }
        });
        //console.log(`[${this.name}] > initialize_master network done`);
        // list the listeners we have for the other services to request
        let listeners = toListeners(this.slaveMethods).map(
            // add out handle request function to the listener
            l => ({ ...l, callback: this.handle_request(l, 'run') })
        );
        // add the _exec listner, we have to add it here as the listners in
        // this.getServiceListeners strips the selector
        let exec_listener : Listener = { event: '_exec', callback: ()=>{} };
        listeners.push({ ...exec_listener, callback: this.handle_request(exec_listener, 'exec') });
        // add the local service listener
        listeners = listeners.concat(this.getServiceListeners());
        // create the server
        this.network.createServer(this.name, this.host, this.port, listeners);
        // initilze the process balancer
        this.initialize_process_balancer();
        // remover self address from the peer addresses by name
        this.peerAddresses = this.peerAddresses.filter((p: ServiceAddress) => p.name !== this.name);
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
        // set service as connected
        this.servicesConnected = true;
        // run the callback for the master process
        if(this.masterCallback !== undefined)
            this.masterCallback({ ...services, slaves: this.nodes, master: this, self: this });
    }

    private async initialize_slaves() {
        // connect to the master process
        let metadata = process.env.metadata;
        if(metadata === undefined)
            throw new Error('could not get post and host of the node manager, metadata is undefined');
        let { host, port } = JSON.parse(metadata)['metadata'];
        // creater the node
        let node = new Node({
            mode: 'client',
            master_host: host,
            master_port: port,
            methods: this.slaveMethods,
            options: {
                timeout: this.options.timeout,
            }
        });
        // connect with the master process
        await node.start();
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
            options: {
                timeout: this.options.timeout,
                stash: this.stash, // set the stash
            }
        })
        // spawn the nodes from the node Manager
        await this.nodes.spawnNodes('slave_' + this.name, this.number_of_nodes, {
            metadata: { host: this.nm_host, port: this.nm_port }
        });
        // register the services in the nodes
        await this.nodes.setServices(this.peerAddresses);
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
                // we pass the functions that the request queue will use,
                // such as getting the next node, and the function to process the request
                get_slave: this.nodes.getIdle.bind(this.nodes),
                process_request:
                    async (node: Node, request: Request) => await node[request.type](request.method, request.parameters),
                options: {
                    heartbeat: 100,
                    requestTimeout: this.options.timeout,
                    onError: this.options?.onError || 'throw',
                }
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
                if(this.nodes === undefined) throw new Error('Nodes are undefined');
                // get the idle nodes
                let count = this.nodes?.getNodeCount();
                if(count === undefined) return { isError: true, error: serializeError(new Error('Nodes are undefined')) }
                // if the number of nodes is greater than the number of nodes we have
                if(node_num > count) return { isError: true, error: serializeError(new Error('Not enough nodes')) }
                if(node_num === 0) node_num = count;
                // select the nodes
                let selected_nodes = [];
                for(let i = 0; i < node_num; i++){
                    let node = this.nodes?.nextNode();
                    if(node === null) throw new Error('could not get node');
                    selected_nodes.push(node.id);
                }
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
            event: '_exec_master',
            params: ['code_string'],
            callback: async (code_string: any) => {
                // check if the code_string is a string
                if(typeof code_string !== 'string')
                    return { isError: true, error: serializeError(new Error('Code string is not a string')) }
                // await until service is connected
                await await_interval({
                    condition: () => this.servicesConnected, timeout: 1000
                }).catch((error) => {
                    return { isError: true, error: serializeError(error || new Error(`[Service] Could not connect to the services`)) };
                });
                
                let service;
                try {
                    service = this.getServices();
                } catch (e) {
                    return { isError: true, error: serializeError(e) };
                }
                
                let parameter = { ...service, master: this, self: this };
                try {
                    // run the albitrary code
                    let result = await execAsyncCode(code_string, parameter);
                    return { result: result };
                } catch(e) {
                    return { isError: true, error: serializeError(e) };
                }
            }
        },{
            event: 'new_service',
            params: ['service_address'],
            callback: async (service_address: ServiceAddress) => {
                if(this.network === undefined) return { isError: true, error: serializeError(new Error('Network is not defined')) };
                
                try {
                    await this.network?.connect(service_address);
                    return { result: true };
                } catch (error) {
                    return { isError: true, error: serializeError(error) };
                }
            }
        },{
            event: 'exit',
            callback: () => ({ result: this.exit() })
        }];
        // get only the paramters, diregar the rest
        return listeners.map(l => {
            return { ...l, callback: ({ parameters }: any) => l.callback(parameters) }
        });
    }

    private handle_request(l: Listener, type: 'run' | 'exec'): Function {
        /* this function will take a listener triggered by another a request
         * it will set the request in the  request queue, and return a promise
         * which resolves once the request is processed.
         * the queue will processs the request when it finds an idle node
         * and the node returns the result. */
        return async (data: any) => {
            if(this.slaveMethods === undefined) throw new Error('Slave Methods are not defined');
            if(this.requestQueue === null)
                throw new Error('Request Queue is not defined');
            let promise = this.requestQueue.addRequest({
                method: l.event,
                type: type,
                parameters: data.parameters,
                selector: data.selection,
            });
            // wait until the request is processed
            let result = await promise;
            if(result.isError) // if there is an error serialize it
                result.error = serializeError(result.error);
            return result;
        }
    }

    private async handle_peer_discovery() {
        if(this.peerDiscoveryAddress === undefined) throw new Error('Peer Discovery Address is not defined');
        if(this.cluster === undefined) throw new Error('Cluster is not defined');
        // check if the peer discovery service is active
        log(`[${this.name}] > Service > Checking if Peer Discovery Service is active`);
        log(`[${this.name}] > Service > Peer Discovery Address: ${this.peerDiscoveryAddress.host}:${this.peerDiscoveryAddress.port}`);
        let serverIsActive = await isServerActive(this.peerDiscoveryAddress);
        if(serverIsActive === false)
            throw new Error('Peer Discovery Service is not active');
        // if it is active we will register to it
        this.peerDiscovery = new PeerDiscoveryClient(this.peerDiscoveryAddress);
        await this.peerDiscovery.connect();
        // register the service to the peer discovery service
        this.peerDiscovery.register({ name: this.name, host: this.host, port: this.port });
        // get the services that we will connect to
        this.peerAddresses = await this.peerDiscovery.getServices();
    }

    private getServices(): { [serviceName: string]: ServiceClient } {
        // get the service from the network
        if(this.network === undefined) throw new Error('Network is not defined');
        let services = this.network.getServices()
        return services.map( (c: Connection) => {
            let name = c.getTargetName();
            if(name === undefined) throw new Error('Service name is undefined');
            return new ServiceClient(name, this.network as Network, this.options);
        }).reduce((acc: any, s: ServiceClient) => {
            acc[s.name] = s;
            return acc;
        }, {})
    }

    public exit(){
        //log(`[${this.name}] will exit in 1 seconds`);
        setTimeout(() => {
            // first we close the ProcessBalancer if we have one
            if(this.processBalancer) this.processBalancer.exit();
            // request queue will be closed
            if(this.requestQueue) this.requestQueue.exit();
            // if peer discovery is defined we will close it
            if(this.peerDiscovery) this.peerDiscovery.exit();
            // then we close the nodes Manager
            if(this.nodes) this.nodes.exit();
            // then we close the connections we have,
            if(this.network) this.network.close();
            // lastly we close ourselves, how sad
            process.exit(0);
        }, 1000);
        return true
    }

    public set = async (key: any, value: any = null) =>
        await this.stash.set(key, value);

    public get = async (key: string = '') =>
        await this.stash.get(key);
}



export default Service;
