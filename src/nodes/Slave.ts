import Network, { Listener, Connection } from '../network';
import { NodeInfo } from './types';
import Node from './Node'

/* this class will make a slave type which will be an a child of the Node class
 * this is the class that will be used to run the the client of a node
 * like other classes it will work as both 
 * the server connection to the client and the client conenction to the server.
 * this class will have a list of methods that will be converted to listeners
 * and a list of listeners that will be converted to methods
 */

type Parameters = {
    name: string,
    type?: 'node' | 'client',
    host?: string,
    port?: number
    heartBeat?: number,
};

class Slave extends Node { 
    /* this class is both the server and the client at the same time.
     * this means that it will create listeners from it's methods
     * and methods from a list of listeners */
    public name: string;
    public type?: 'node' | 'client';
    public isConnected: boolean = false;
    public network: Network;

    constructor(options: Parameters) {
        this.type = options.type;
        this.name = options.name;
        this.heartBeat = options.heartBeat ?? 100; // 100ms
        this.network = new Network();
    }

    public async connect({ name, host, port }: ServiceInfo): Promise<this> {
        /*this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        this.type = 'client';
        if(!host || !port) throw new Error('The service information is not complete');
        // check if there is a service already running on the port and host
        let conn = await this.network.connect(name, host, port);
        // get listners from Connection
        let listeners = conn.targetListeners;
        // create method from listners which run the query on the connection
        listeners.forEach((listener: Listener) => {
            (this as any)[listener.event] = async (data: any) => {
                // pool the lstest connection form network
                let conn = this.network.getService(this.name);
                // and send the data
                return await conn.send(listener.event, data);
            }
        });
        // set the connection to be true
        this.isConnected = true;
        // return this
        return this
    }

    public async RegisterListener(): Promise<void> {
        /* this takes the method and registers them as listners */
        this.type = 'node';
        // create the service
        let methods = this.getAllMethods();
        // filter the excepted methods
        methods = methods.filter(
            (method:string) => !this.exceptedMethods.includes(method)
        );
        // create the listeners
        let listeners : Listener[] = methods.map((method:string) => ({
            event: method,
            // this is a function will call the mothod form this class
            // in theory this will allow the function to be changed
            callback: async (data: any) => {
                return await (this as any)[method](data).bind(this)
            }
        }));
        // add the listners on every socket for every server.
        let services = this.network.getServices();
        services.forEach((service: Connection) => {
            service.setListeners(listeners);
        });
        // set is connected to true
        this.isConnected = true;
    }

    public async isReady(): Promise<boolean> {
        // await until the priary service has either
        // created the service or it has connected to the service
        return new Promise((resolve, reject) => {
            let interval: any, timeout: any;
            // set timeout to 30 seconds
            timeout = setTimeout(() => { 
                clearInterval(interval);
                reject('Timeout for service to be ready'); }, 30000);
            interval = setInterval(() => {
                if(this.type === 'client' && this.isConnected) {
                    timeout && clearTimeout(timeout);
                    clearInterval(interval);
                    resolve(true);
                }
            }, 100);
        });
    }

    protected addExceptedMethods(methods: string[]) {
        // add to the exceptedMethods
        this.exceptedMethods = this.exceptedMethods.concat(methods);
    }

    private getAllMethods(): string[] {
        // this function return all the methods of the class
        const methods : string[] = [];
        let obj = Object.getPrototypeOf(this);
        while (obj && obj !== Object.prototype) {
            const propertyNames = Object.getOwnPropertyNames(obj);
            for (const name of propertyNames) {
                if (typeof (this as any)[name] === 'function' && name !== 'constructor')
                    methods.push(name);
            }
            obj = Object.getPrototypeOf(obj);
        }
        return methods;
    }

    /* function that can be called by a client */

    public async add_service(service: ServiceInfo): Promise<boolean> {
        // get the service infomation and add it to the network
        // this function will be called by tye primary service to add a new service
        if(!service.host || !service.port)
            throw new Error('The service information is not complete');
        // the newtorks keeps track of the connections
        await this.network.connect(service.name, service.host, service.port);
        return true
    }

    public async run(method: string, data: any): Promise<any> {
        // this function will be called by the a service or another node to run a function
        try {
            return await (this as any)[method](data);
        } catch(err) {
            // serilize the error
            return serializeError(err);
        }
        
    }

    public async 



}


export default Slave;
