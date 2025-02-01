import Network, { Listener } from '../network';
import { ServiceAddress } from './types';

type Parameters = {
    name: string,
    type?: 'service' | 'client',
    host?: string,
    port?: number
    tag?: string,
    heartBeat?: number,
};

class Service {
    /* this class is both the server and the client at the same time.
     * depending on which paramter it get passed or which method get called,
     * the connect() method will make this class a client
     * if it is a client we will create methods in this instance for each listener we get from the service
     * the createService() method will create server which will get all the methods (that are not exlcuded)
     * and create listners for each fo them which will run the method with the given paramter
     */
    public name: string;
    public type?: 'service' | 'client';
    public isConnected: boolean = false;
    public isServiceCreated: boolean = false;
    public host: string;
    public port: number;
    public tag?: string;
    public network: Network;
    protected heartBeat: number = 100;
    protected exceptedMethods: string[];

    constructor(options: Parameters) {
        this.type = options.type;
        this.name = options.name;
        this.host = options.host ?? 'localhost';
        this.tag = options.tag;
        this.port = options.port ?? 3000;
        this.exceptedMethods = [
            'connect', 'isReady', 'checkService',
            'constructor', 'createServer',
            'getAllMethods', 'addExceptedMethods'
        ];
        this.heartBeat = options.heartBeat ?? 100; // 100ms
        this.network = new Network();
    }

    public async connect(): Promise<Service> {
        /* this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        this.type = 'client';
        // check if there is a service already running on the port and host
        let conn = await this.network.connect(this.name, this.host, this.port, this.tag);
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
        return this;
    }

    public async createService() {
        this.type = 'service';
        // make the listeners to be the methods of the class
        let methods = this.getAllMethods();
        // remove the constructor, createServer and getAllMethods
        methods = methods.filter(
            (method:string) => !this.exceptedMethods.includes(method)
        );
        // create the listeners
        let listeners = methods.map((method:string) => ({
            event: method,
            // this is a function will call the mothod form this class
            // in theory this will allow the function to be changed
            callback: async (data: any) => {
                return await (this as any)[method](data).bind(this)
            }
        }));
        // create the server
        this.network.createServer(this.name, this.host, this.port, listeners);
        // set the service created to true
        this.isServiceCreated = true;
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
                if(this.type === 'service' && this.isServiceCreated) {
                    timeout && clearTimeout(timeout);
                    clearInterval(interval);
                    resolve(true);
                }
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

    public async newService(name: string, host: string, port: number): Promise<Service> {
        // create a new service
        let service = new Service({ name, host, port });
        await service.createService();
        return service;
    }

    /* function that can be called by a client */
    public async add_service(service: ServiceAddress): Promise<boolean> {
        // get the service infomation
        // make a connection to the service
        if(!service.host || !service.port)
            throw new Error('The service information is not complete');
        // the newtorks keeps track of the connections
        await this.network.connect(service.name, service.host, service.port);
        return true
    }
        

    // this function will be converted to a listener
    // and called when a client connects to the service
    public is_service(): string {
        return this.name;
    }


}


export default Service;
