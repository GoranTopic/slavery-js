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
    private availableAdress?: Address[];
    private addressWindowCount: number;

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
        // set availableAdress to undefined
        this.availableAdress = undefined;
        this.addressWindowCount = 1;
        // set the methods what will not be exposed in the service
        this.addExceptedMethods([
            'findAvailablePorts', 
        ]);
    }

    private async findAvailableAdress(host: string, port: number): Promise<Address[]> {
        // get the list of available ports
        let initialPort = port + 1;
        // define window zie
        if(this.availableAdress?.length === 0)
            this.addressWindowCount++;
        let windowsize = this.addressWindowCount * this.serviceNames.length;
        // get al list of ports
        let availableAdress = await Connection.
            findAvailablePorts(host, initialPort, windowsize);
        // return 
        return availableAdress;
        // save the available ports
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

    public async register_service({name, host, port} : ServiceInfo): Promise<boolean> {
        // this function will get the Service and add the service to the pool
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

    public async assign_address(service_name: string): Promise<Address> {
        /* assign a port and a host to a service */
        // get the address
        if(this.availableAdress === undefined || this.availableAdress.length === 0)
            this.availableAdress = await this.findAvailableAdress(this.host, this.port);
        // get the address
        let address = this.availableAdress.shift();
        if(address === undefined) throw new Error('No available address');
        // add address to the pool of services
        this.services.add(
            service_name, {name: service_name, host: address.host, port: address.port}
        );
        // return the address
        return address;
    }

}

export default Primary;
     
