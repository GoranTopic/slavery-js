import Network, { Listener, Connection } from '../network';
import { ServiceAddress } from './types';
import { await_interval } from '../utils';
import { serializeError } from 'serialize-error';

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
    public mode: 'client' | 'server' | undefined  = undefined;
    public id: string | undefined = undefined;
    public status: NodeStatus = 'idle';
    public listeners: Listener[] = [];
    public lastUpdateAt: number = Date.now();
    public network: Network | undefined = undefined;
    // fields when the class is client handler on a service
    public servicesConnected: boolean = false;
    public statusChangeCallback: ((status: NodeStatus, node: Node) => void) | null = null;
    // fields when the class is a service handler on a node
    public services: ServiceAddress[] = [];
    public areServicesConnected: boolean = false;
    public doneMethods: { [key: string]: boolean } = {};
    public methods: { [key: string]: (parameter: any) => any } = {};

    constructor(){
    }

    /* this function will work on any mode the class is on */

    public getId = () => this.id;
    public getStatus = () => this.status;
    public lastHeardOfIn = () => Date.now() - this.lastUpdateAt;
    public isIdle = () => this.status === 'idle';
    public isWorking = () => this.status === 'working';
    public isError = () => this.status === 'error';
    private updateLastHeardOf = () => this.lastUpdateAt = Date.now();
    private updateStatus = (status: NodeStatus) => this.status = status;
    public untilFinish = async () => { // await until the function is idle
        await await_interval(() => this.isIdle(), 1000); return true;
    }

    public run = async (method: string, parameter: any) => {
        if(this.mode === 'client') return await this.run_server(method, parameter);
        else if(this.mode === 'server') return await this.run_client({ method, parameter });
        else throw new Error('The mode has not been set');
    }

    public exit = async () => {
        if(this.mode === 'client') return process.exit(0);
        else if(this.mode === 'server') return await this.send('exit', null);
        else throw new Error('The mode has not been set');
    }

    public ping = async () => {
        if(this.mode === 'client') return await this.ping_client();
        else if(this.mode === 'server') return await this.ping_server();
        else throw new Error('The mode has not been set');
    }

    /* this functions will set the Node.ts as a client handler for the server */

    public setNodeConnection(connection: Connection, network: Network){
        if(this.mode !== null) throw new Error('The node mode has already been set');
        // set the mode as a client
        this.mode = 'server';
        // get the node id from the conenction
        this.id = connection.getId();
        // set the network
        this.network = network;
        // define the listners which we will eb using to talk witht the client node
        this.listeners = [//  this callbacks will run when we recive this event from the client node
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

    private async run_server(method: string, parameter: any){
        // this function will send the node a method to be run in the client
        // set the status to working
        this.updateStatus('working');
        let res = await this.send('run', { method, parameter });
        this.updateStatus('idle');
        return res;
    }
    
    public async ping_server(){
        // this function will ping the client node
        let res = await this.send('ping');
        if(res === 'pong') this.updateLastHeardOf();
        return true;
    }

    public async exit_server(){
        // this function tell the node client to exti
        return await this.send('exit');
    }

    public async registerServices(service: ServiceAddress[]){
        // for every service we need to send the service address to the client node
        let services = service.map(service => new Promise(async (resolve) => {
            let result = await this.send('connect_service', service);
            resolve(result);
        }));
        // await until they are all connected
        return await Promise.all(services);
    }

    private async send(method: string, parameter: any = null){
        // fucntion for sending a method to the client node
        if(this.network === undefined) throw new Error('The network has not been set');
        if(this.id === undefined) throw new Error('The id has not been set');
        if(this.mode === undefined) throw new Error('The mode has not been set');
        // get the connection of which we will send the method
        let connection: Connection | undefined = undefined;
        if(this.mode === 'server') 
            connection = this.network.getNode(this.id);
        else if(this.mode === 'client') 
            connection = this.network.getNode('master');
        if(connection === undefined) throw new Error('Could not get the conenction from the network');
        // send the method to the node
        return await connection.send(method, parameter);
    }


    

    /* this function will be called when the client node tells us that it is working */

    public async connectToMaster(host: string, port: number){
        // conenct the master process which will tell us what to do
        this.network = new Network();
        this.network.connect('master', host, port);
        // set the mode as a client
        this.mode = 'client';
        // set the listeners which we will us
        this.listeners = [
            { event: 'run', parameters: ['method', 'parameter'], callback: this.run_client.bind(this) },
            { event: 'set_services', parameters: ['primary', 'services'], callback: this.handleSetServices.bind(this) },
            { event: 'is_idle', parameters: [], callback: this.isIdle },
            { event: 'is_busy', parameters: [], callback: this.isBusy },
            { event: 'is_error', parameters: [], callback: this.isError },
            { event: 'has_done', parameters: ['method'], callback: this.hasDone },
            { event: 'ping', parameters: [], callback: () => 'pong' },
            { event: 'exit', parameters: [], callback: this.exit }
        ];
        // register the listeners on the network
        this.network.registerListeners(this.listeners);
    }

    private async run_client({method, parameter}: {method: string, parameter: any}){
        // this function will be called by the a service or another node to run a function
        try {
            // set the status to working
            this.updateStatus('working');
            // run method
            let result = await this.methods[method](parameter);
            // set has done method
            this.doneMethods[method] = true;
            // return the result
            return result;
        } catch(err) {
            // serilize the error
            this.updateStatus('error');
            // return the error
            return serializeError(err);
        } finally {
            // set the status to idle
            this.updateStatus('idle');
        }
    }

    public addMethods(methods: { [key: string]: (parameter: any) => any }){
        // we add the methods to this class
        this.methods = methods;
        // populate methods done
        for(let method in methods)
            this.doneMethods[method] = false;
    }

    public async handleSetServices(services: ServiceAddress[]){
        // we get the list of services that we need to connect to
        this.services = services;
        // connect to the services
        for(let service of services){
            let res = await this.connect_service(service);
            if(!res){
                //throw new Error('Could not connect to the service, ' + service.name);
                console.error('Could not connect to the service, ', service.name);
            }
        }
        this.areServicesConnected = true;
        return true
    }

    public async connect_service({ name, host, port }: ServiceAddress){
        /* this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        if(!host || !port) throw new Error('The service information is not complete');
        // check if there is a service already running on the port and host
        if(this.network === undefined) throw new Error('The network has not been set');
        return await this.network.connect(name, host, port);
    }
    
    private async ping_client(){
        // this function will ping the master node
        let res = await this.send('ping');
        if(res === 'pong') this.updateLastHeardOf();
        return true;
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
    public toFinish = this.untilFinish;

}


export default Node;
