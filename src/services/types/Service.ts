import Network, { Listener, Connection } from '../../network';


type Parameters = {
    name: string,
    type?: 'service' | 'client',
    host?: string,
    port?: number
    heartBeat?: number,

};

class Service {
    protected name: string;
    protected type: 'service' | 'client' | undefined;
    protected heartBeat: number = 100;
    protected host: string;
    protected port: number;
    protected network: Network;
    protected exceptedMethods: string[];

    constructor(options: Parameters) {
        /* this class is both the server and the client at the same time.
         * this means that it will create listeners from it's methods
         * and methods from a list of listeners */
        this.type = options.type;
        this.name = options.name;
        this.host = options.host ?? 'localhost';
        this.port = options.port ?? 3000;
        this.exceptedMethods = [
            'constructor', 'createServer',
            'getAllMethods', 'addExceptedMethods'
        ];
        this.heartBeat = options.heartBeat ?? 100; // 100ms
        this.network = new Network();
    }

    public createService() {
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
            // @ts-ignore
            callback: this[method].bind(this)
        }));
        // create the server
        this.network.createServer(this.name, this.host, this.port, listeners);
    }

    protected addExceptedMethods(methods: string[]) {
        // add to the exceptedMethods
        this.exceptedMethods = this.exceptedMethods.concat(methods);
    }

    private getAllMethods(): string[] {
        const methods : string[] = [];
        let obj = Object.getPrototypeOf(this);
        while (obj && obj !== Object.prototype) {
            const propertyNames = Object.getOwnPropertyNames(obj);
            for (const name of propertyNames) {
                // @ts-ignore
                if (typeof this[name] === 'function' && name !== 'constructor') {
                    methods.push(name);
                }
            }
            obj = Object.getPrototypeOf(obj);
        }
        return methods;
    }

    public async checkService(): Promise<boolean> {
        // check if there is already a pimary network service running
        return await checkSocket(this.host, this.port);
    }




}


export default Service;
