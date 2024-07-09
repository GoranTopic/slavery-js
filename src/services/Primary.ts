import { Connection } from '../network';
import Service from './Service';
import { Pool } from '../utils';
import { ServiceInfo, Address } from './types';

type Parameters = {
    host: string,
    port: number,
    type?: 'service' | 'client',
    listOfServices: string[],
    options: any,
}

class Primary extends Service {
    /* this is the class that will create primary service,
     * the primary is the default network,
     * other services will try to conenct to it to get the infomation about the network
     * and find other srvice, it will also give out ports and hosts to other services. */
    private services: Pool<ServiceInfo>;
    private serviceNames: string[];

    constructor({host, port, listOfServices, type}: Parameters) {
        const name = 'Primary';
        super({name, host, port, type});
        // set serviceNames
        this.serviceNames = listOfServices
        // create a pool of services
        this.services = new Pool<ServiceInfo>();
        // add the list of services
        for (let service of this.serviceNames)
            this.services.add(service, {name: service, host: undefined, port: undefined});
        // set the methods what will not be exposed in the service
        this.addExceptedMethods([
        ]);
    }

    public async broadcastNewService(data: any): Promise<Boolean> {
        // this will take all the clients connections and send the data to them
        let clients = this.network.getNodes();
        await Promise.all(clients.map(async (client: Connection) => {
            await client.query('add_service', data);
        }));
        return true;
    }


    /* function that can be called by a client */

    public async get_services(): Promise<ServiceInfo[]> {
        // get the list of services
        return this.services.toArray();
    }

    public async register_service(service : Service): Promise<boolean> {
        // this function will get the Service 
        // from the service it will waint until the service is ready
        // get the name, host and port of the service
        // and add it to the list of services
        // check if the service is in the list of services
        await service.isReady();
        // get the information about the service
        let name = service.name;
        let host = service.host;
        let port = service.port;
        // check if the service is in the list of services
        if(this.services.has(name)) 
            // if the service is in the list of services remove it
            this.services.remove(name);
        // add the service to the pool
        this.services.add(name, {name, host, port});
        // broad cast new service to your clients 
        await this.broadcastNewService({name, host, port});
        // returns a boolian
        return true;
    }

    public is_primary_service(): boolean {
        // this methodh wihch will answer by checkService function
        return true;
    }

}

export default Primary;
     
