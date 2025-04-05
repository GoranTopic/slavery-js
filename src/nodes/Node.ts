import Network, { Listener, Connection } from '../network';
import { ServiceClient } from '../service';
import type { ServiceAddress } from './types';
import { await_interval, log } from '../utils';
import { serializeError, deserializeError } from 'serialize-error';

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
    public servicesConnected: boolean = false;
    // fields when the class is client handler on a service
    public statusChangeCallback: ((status: NodeStatus, node: Node) => void) | null = null;
    // stash changes functions
    public stashSetFunction: (({ key, value }: { key: string, value: any }) => any) | null = null;
    public stashGetFunction: ((key: string) => any) | null = null;
    // fields when the class is a service handler on a node
    public services: ServiceAddress[] = [];
    public doneMethods: { [key: string]: boolean } = {};
    public methods: { [key: string]: (parameter?: any, self?: Node) => any } = {};

    constructor(){}

    /* this function will work on any mode the class is on */

    public getId = () => this.id;
    public getStatus = () => this.status;
    public lastHeardOfIn = () => Date.now() - this.lastUpdateAt;
    public isIdle = () => this.status === 'idle';
    public isWorking = () => this.status === 'working';
    public isError = () => this.status === 'error';
    private updateLastHeardOf = () => this.lastUpdateAt = Date.now();
    private updateStatus = (status: NodeStatus) => this.status = status;
    public untilFinish = async () => { // await until the node is idle
        await await_interval(() => this.isIdle(), 1000)
        .catch(() => { throw new Error('The node is not idle') })
        return true;
    }

    public run = async (method: string, parameter: any) => {
        if(this.mode === 'client') return await this.run_client({ method, parameter });
        else if(this.mode === 'server') return await this.run_server({ method, parameter });
        else throw new Error('The mode has not been set');
    }

    public exec = async (code: string) => {
        if(this.mode === 'client') return await this.exec_client(code);
        else if(this.mode === 'server') return await this.exec_server(code);
        else throw new Error('The mode has not been set');
    }

    public setServices = async (services: ServiceAddress[]) => {
        if(this.mode === 'client') return await this.setServices_client(services);
        else if(this.mode === 'server') return await this.setServices_server(services);
        else throw new Error('The mode has not been set');
    }

    public exit = async () => {
        if(this.mode === 'client') return await this.exit_client();
        else if(this.mode === 'server') return await this.exit_server();
        else throw new Error('The mode has not been set');
    }

    public ping = async () => {
        if(this.mode === 'client') return await this.ping_client();
        else if(this.mode === 'server') return await this.ping_server();
        else throw new Error('The mode has not been set');
    }

    /* this functions will set the Node.ts as a client handler for the server */
    public setNodeConnection(connection: Connection, network: Network){
        if(this.mode !== undefined && this.mode !== null )
            throw new Error('The node mode has already been set');
        // set the mode as a server client hander
        this.mode = 'server';
        // get the node id from the conenction
        this.id = connection.getTargetId();
        // set the network
        this.network = network;
        // define the listners which we will be using to talk witht the client node
        if(this.stashSetFunction === null || this.stashGetFunction === null )
            throw new Error('The stash functions have not been set');
        // set the listeners
        this.listeners = [//  this callbacks will run when we recive this event from the client node
            { event: '_set_status', parameters: ['status'], callback: this.handleStatusChange.bind(this) },
            { event: '_ping', parameters: [], callback: () => '_pong' },
            { event: '_set_stash', parameters: ['key', 'value'], callback: this.stashSetFunction },
            { event: '_get_stash', parameters: ['key'], callback: this.stashGetFunction },
        ]
            // register the listeners on the connection
            connection.setListeners(this.listeners);
    }

    public setStatusChangeCallback(callback: (status: NodeStatus, node: Node) => void){
        this.statusChangeCallback = callback;
    }

    public setStashFunctions({ set, get }: { set: (key: string, value: any) => any, get: (key: string) => any }){
        this.stashSetFunction = ({ key, value }: { key: string, value: any }) => set(key, value);
        this.stashGetFunction = get;
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

    private async run_server({method, parameter}: {method: string, parameter: any}){
        // this function will send the node a method to be run in the client
        // set the status to working
        this.handleStatusChange('working');
        let res = await this.send('_run', { method, parameter });
        // set the status to idle
        this.handleStatusChange('idle');
        // if there is an error
        if(res.isError === true)
            res.error = deserializeError(res.error);
        // return the result
        return res
    }

    private async exec_server(code: string){
        // this function will send the node a code to be run in the client
        // set the status to working
        this.handleStatusChange('working');
        let res = await this.send('_exec', code);
        // set the status to idle
        this.handleStatusChange('idle');
        // if there is an error
        if(res.isError === true)
            res.error = deserializeError(res.error);
        // return the result
        return res
    }

    private async setServices_server(services: ServiceAddress[]){
        // this function will send send a list of services to the client node
        let res = await this.send('_set_services', services);
        return res;
    }

    public async ping_server(){
        // this function will ping the client node
        let res = await this.send('_ping');
        if(res === 'pong') this.updateLastHeardOf();
        return true;
    }

    public async exit_server(){
        // this function tell the node client to exit
        let res = await this.send('_exit', null)
        // we catch the timeout erro scince the client node will exit
        .catch((error) => { if(error === 'timeout') return true; else throw error; });
        return res
    }

    public async registerServices(service: ServiceAddress[]){
        // for every service we need to send the service address to the client node
        let services = service.map(service => new Promise(async (resolve) => {
            let result = await this.send('_connect_service', service);
            resolve(result);
        }));
        // await until they are all connected
        return await Promise.all(services);
    }

    public async send(method: string, parameter: any = null){
        // fucntion for sending a method to the client node
        if(this.network === undefined) throw new Error('The network has not been set');
        if(this.id === undefined) throw new Error('The id has not been set');
        if(this.mode === undefined) throw new Error('The mode has not been set');
        // get the connection of which we will send the method
        let connection: Connection | undefined = undefined;
        if(this.mode === 'server') 
            connection = this.network.getNode(this.id);
        else if(this.mode === 'client') 
            connection = this.network.getService('master');
        if(connection === undefined) 
            throw new Error('Could not get the conenction from the network');
        // send the method to the node
        return await connection.send(method, parameter);
    }


    /* this function will be called when the client node tells us that it is working */
    public async connectToMaster(host: string, port: number){
        // conenct the master process which will tell us what to do
        // create an id for the node
        this.id = this.id || Math.random().toString(36).substring(4);
        this.network = new Network({name: 'node', id: this.id});
        // form the conenction with the master
        this.network.connect({ host, port, as: 'master' });
        // set the mode as a client
        this.mode = 'client';
        // set the listeners which we will us on the and the master can call on
        this.listeners = [
            { event: '_run', parameters: ['method', 'parameter'], callback: this.run_client.bind(this) },
            { event: '_exec', parameters: ['code_string'], callback: this.exec_client.bind(this) },
            { event: '_set_services', parameters: ['services'], callback: this.setServices_client.bind(this) },
            { event: '_is_idle', parameters: [], callback: this.isIdle.bind(this) },
            { event: '_is_busy', parameters: [], callback: this.isBusy.bind(this) },
            { event: '_has_done', parameters: ['method'], callback: this.hasDone.bind(this) },
            { event: '_ping', parameters: [], callback: () => 'pong' },
                { event: '_exit', parameters: [], callback: this.exit_client.bind(this) }
        ];
        // register the listeners on the network
        this.network.registerListeners(this.listeners);
    }

    private async run_client({method, parameter}: {method: string, parameter: any}){
        // this function will be called by the a service or another node to run a function
        // wait until services are connected, with timeout of 10 seconds
        await await_interval(() => this.servicesConnected, 10000).catch(() => {
            throw new Error(`[Node][${this.id}] Could not connect to the services`);
        })
        try {
            // set the status to working
            this.updateStatus('working');
            // get the services that we have connected to
            let services = this.services.map(
                (s: ServiceAddress) => new ServiceClient(s.name, this.network as Network)
            ).reduce((acc: any, s: ServiceClient) => {
                acc[s.name] = s;
                return acc;
            }, {})
            // run method
            const result = await this.methods[method](parameter, { ...services, slave: this, self: this });
            // set has done method
            this.doneMethods[method] = true;
            // return the result
            return { result, isError: false };
        } catch(error){ // serilize the error
            this.updateStatus('error');
            // return the error
            return { error: serializeError(error), isError: true };
        } finally {
            // set the status to idle
            this.updateStatus('idle');
        }
    }


    private async exec_client(code_string: string){
        /* this function will execute some passed albitrary code */
        // check if the code_string is a string
        let service = this.getServices();
        let parameter = { ...service, master: this, self: this };
        let code = new Function('services', code_string);
        return await new Promise(resolve => code(parameter).then((r: any) => {
            if(r.isError === true)
                resolve({ isError: true, error: serializeError(r.error) })
            else
                resolve({ result: r })
        }))
    }
    
    public async _startup(){
        // this function should not be here, and Node class should be self contained
        // thus this class need an outside class to call it, after it has set up its
        // addMethods and setServices and connectToMaster functions have run.
        if(this.methods['_startup'] !== undefined)
            await this.run_client({ method: '_startup', parameter: null });
    }

    
    // this function will communicate with the master node and set the stash in that moment
    public setStash = async (key: any, value: any = null) => await this.send('_set_stash', { key, value });
    public getStash = async (key: string = '') => await this.send('_get_stash', key);

    public addMethods(methods: { [key: string]: (parameter: any) => any }){
        // we add the methods to this class
        this.methods = methods;
        // populate methods done
        for(let method in methods)
            this.doneMethods[method] = false;
    }

    private getServices(): { [serviceName: string]: ServiceClient } {
        // get the service from the network
        if(this.network === undefined) throw new Error('Network is not defined');
        let services = this.network.getServices()
        return services.map( (c: Connection) => {
            let name = c.getTargetName();
            if(name === undefined) throw new Error('Service name is undefined');
            return new ServiceClient(name, this.network as Network);
        }).reduce((acc: any, s: ServiceClient) => {
            acc[s.name] = s;
            return acc;
        }, {})
    }

    private async setServices_client(services: ServiceAddress[]){
        // we get the list of services that we need to connect to
        this.services = services;
        // connect to the services
        for(let service of services){
            let res = await this.connectService(service);
            if(!res)
                console.error('Could not connect to the service, ', service.name);
            else 
                log(`[Node][${this.id}] Connected to the service, ${service.name}`);
        }
        this.servicesConnected = true;
        return true
    }

    public async connectService({ name, host, port }: ServiceAddress){
        /* this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        if(!host || !port)
            throw new Error('The service information is not complete');
        // check if there is a service already running on the port and host
        if(this.network === undefined)
            throw new Error('The network has not been set');
        return await this.network.connect({name, host, port});
    }
    
    private async ping_client(){
        // this function will ping the master node
        let res = await this.send('_ping');
        if(res === '_pong') this.updateLastHeardOf();
        return true;
    }

    private async exit_client(){
        // before we bail we must be nice enough to close our connections
        setTimeout(async () => {
            // if there is a _cleanup method defined
            if(this.methods['_cleanup'] !== undefined)
                await this.run_client({ method: '_cleanup', parameter: null });
            // we close the connections we have,
            if(this.network !== undefined) this.network.close();
            // then we exit the process
            process.exit(0);
        }, 1000);
        return true
    }

    public getListeners(){
        if(this.network === undefined) throw new Error('The network has not been set');
        if(this.id === undefined) throw new Error('The id has not been set');
        let listeners = [];
        let connection: Connection | undefined = undefined;
        if(this.mode === 'server'){
            connection = this.network.getNode(this.id);
            listeners = connection.getListeners();
        }else if(this.mode === 'client'){
            connection = this.network.getNode('master');
            listeners = connection.getListeners();
            if(connection === undefined) 
                throw new Error('Could not get the conenction from the network');
        }
        return listeners;
    }

    public hasDone(method: string){
        return this.doneMethods[method] || false;
    }

    /* method synonims */
    public isBusy = this.isWorking;
    public hasFinished = this.hasDone;
    public hasError = this.isError;
    public toFinish = this.untilFinish;
    public set = this.setStash;
    public get = this.getStash;
    public stash = this.setStash;
    public unstash = this.getStash;
}


export default Node;
