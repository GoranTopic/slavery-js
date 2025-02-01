import Network, { Listener, Connection } from '../network';
import { ServiceInfo } from './types';
//import serializeError from 'serialize-error';

/*
 * this class will basicaly connect to all of the services given to it by the primary service.
 * 1.- attempt to make a conenction the primary service passed by the server
 * 2.- it will take a list of services


/* this calss will make a slave type which will be an a child of the Node class
 * this is the class that will be used to run the the client of a node
 * like other classes it will work as both
 * the server connection to the client and the client conenction to the server.
 * this class will have a list of methods that will be converted to listeners
 * and a list of listeners that will be converted to methods
 */

type NodeStatus = 'idle' | 'working' | 'error';

class Node {
    public id: string | undefined = undefined;
    public status: NodeStatus = 'idle';
    public type: 'node' | 'service' | undefined  = undefined;
    public listeners: Listener[] = [];
    public lastUpdateAt: number = Date.now();
    public network: Network | undefined = undefined;
    // fields when the class is client handler on a service
    public servicesConnected: boolean = false;
    public statusChangeCallback: ((status: NodeStatus, node: Node) => void) | null = null;
    // fields when the class is a service handler on a node
    public services: ServiceInfo[] = [];
    public areServicesConnected: boolean = false;
    public doneMethods: { [key: string]: boolean } = {};


    /* this function will work on any mode the class is on */

    public getId = () => this.id;
    public getStatus = () => this.status;
    public lastHeardOfIn = () => Date.now() - this.lastUpdateAt;
    public isIdle = () => this.status === 'idle';
    public isWorking = () => this.status === 'working';
    public isError = () => this.status === 'error';
    public exit = () => process.exit(0);
    private updateLastHeardOf = () => this.lastUpdateAt = Date.now();
    private updateStatus = (status: NodeStatus) => this.status = status;

    /* this functions will set the Node.ts as a client handler for the server */

    public setNodeConnection(connection: Connection, network: Network){
        if(this.type !== null) throw new Error('The node type has already been set');
        // set the type as a client
        this.type = 'service';
        // get the node id from the conenction
        this.id = connection.getId();
        // set the network
        this.network = network;
        // define the listners which we will eb using to talk witht the client node
        this.listeners = [
            { event: 'set_status', parameters: ['status'], callback: this.handleStatusChange.bind(this) },
            { event: 'ping', parameters: [], callback: () => 'pong' },
            { event: 'error', parameters: ['error'], callback: this.handleError },
            { event: 'result', parameters: ['result'], callback: this.handleResult }
        ]
        // register the listeners on the connection
        this.network.registerListeners(this.listeners);
    }

    public handleResult(result: any){
        // this function will be called when the client node tells us that it has a result
        this.handleStatusChange('idle');
        console.log('result from slave: ', result);
    }

    public handleError(error: any){
        // this function will be called when the client node tells us that it has an error
        this.handleStatusChange('error');
        console.error('error from slave: ', error);
    }

    public setStatusChangeCallback(callback: (status: NodeStatus, node: Node) => void){
        this.statusChangeCallback = callback;
    }

    public handleStatusChange(status: NodeStatus){
        // set status as status and call the callback
        this.updateStatus(status);
        this.statusChangeCallback && this.statusChangeCallback(status, this);
    }

    public lastHeardOf(){
        // this function will be called when the client node tells us that it is working
        this.updateLastHeardOf();
        return this.lastHeardOfIn();
    }

    /* this function will be called when the client node tells us that it is working */

    public async connect_to_master(host: string, port: number){
        // conenct the master process which will tell us what to do
        this.network = new Network();
        this.network.connect('master', host, port);
        // set the listeners which we will us
        this.listeners = [
            { event: 'run', parameters: ['method', 'parameter'], callback: this.run.bind(this) },
            { event: 'set_services', parameters: ['primary', 'services'], callback: this.handleSetServices.bind(this) },
            { event: 'is_idle', parameters: [], callback: this.isIdle },
            { event: 'is_busy', parameters: [], callback: this.isBusy },
            { event: 'is_error', parameters: [], callback: this.isError },
            { event: 'has_done', parameters: ['method'], callback: this.hasDone },
            { event: 'ping', parameters: [], callback: () => 'pong' },
            { event: 'exit', parameters: [], callback: this.exit }
        ];
    }

    public async run(method: string, parameter: any): Promise<any> {
        // this function will be called by the a service or another node to run a function
        try {
            // set the status to working
            this.updateStatus('working');
            // run method
            let result = null // run function
            // return the result
            return result;
        } catch(err) {
            // serilize the error
            this.updateStatus('error');
            // return the error
            //return serializeError(err);
        } finally {
            // set the status to idle
            this.updateStatus('idle');
            // set has done method
            this.doneMethods[method] = true;
        }
    }

    public async handleSetServices(services: ServiceInfo[]){
        // we get the list of services that we need to connect to
        this.services = services;
        // connect to the services
        for(let service of services)
            await this.connect_service(service);
        this.areServicesConnected = true;
        return true
    }

    public async connect_service({ name, host, port }: ServiceInfo): Promise<this> {
        /* this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        if(!host || !port) throw new Error('The service information is not complete');
        // check if there is a service already running on the port and host
        if(this.network === undefined) throw new Error('The network has not been set');
        await this.network.connect(name, host, port);
        // return this
        return this
    }

    public get_services(){
        // return the service that we have conencted to
        return this.services;
    }

    public hasDone(method: string){
        return this.doneMethods[method] || false;
    }

    /* method synonims */
    public isBusy = this.isWorking;
    public hasFinished = this.hasDone;
    public hasError = this.isError;

}


export default Node;
