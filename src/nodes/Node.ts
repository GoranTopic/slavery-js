import Network, { Listener, Connection } from '../network';
import { ServiceInfo } from './types';

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


class Node {
    public id: string;
    public isConnected: boolean = false;
    public network: Network;

    constructor(options: Parameters) {
        this.network = new Network();
    }


    public async connect_services(services: ServiceInfo[]): Promise<this> {
        // for every service in the list connect to the service
        for(let service of services) 
            await this.connect_service(service);
        // set the connection to be true
        this.isConnected = true;
        return this;
    }

    public async connect_service({ name, host, port }: ServiceInfo): Promise<this> {
        /* this is the client inplementation.
         * it will connect to the service and create methods
         * for every listener that the service has */
        if(!host || !port) throw new Error('The service information is not complete');
        // check if there is a service already running on the port and host
        await this.network.connect(name, host, port);
        // return this
        return this
    }


    public async run(method: string, data: any): Promise<any> {
        // this function will be called by the a service or another node to run a function
        try {
            
        } catch(err) {
            // serilize the error
            return serializeError(err);
        }
    }

    public async get_services(){
        // return the service that we have conencted to 
    }


}


export default Node
