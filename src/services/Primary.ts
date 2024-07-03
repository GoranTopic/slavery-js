import Service from './types/Service';
import findAvailablePort from '../utils/findAvailablePorts';
import checkPrimaryServiceSocket from '../utils/checkPrimaryServiceSocket.ts'

type ServiceParams = {
    host: string,
    port: number,
    listOfServices: string[],
    options: any,
}

class Primary extends Service {
    /* this is the class that will create primary service,
     * the primary is the default network,
     * other services will try to conenct to it to get the infomation about the network
     * and find other srvice, it will also give out ports and hosts to other services. */
    private services: string[];
    private availablePorts: number[] | undefined;

    constructor({host, port, listOfServices, options}: ServiceParams) {
        const name = 'Primary';
        super({name, host, port});
        this.services = listOfServices;
        // set the methods what will not be exposed int he service
        this.addExceptedMethods([]);
    }
    
    
    public async checkService(): Promise<boolean> {
        // check if there is already a pimary network service running
        return await checkPrimaryServiceSocket(this.host, this.port);
    }

    public connectService(): void {
        // this will create a socket to connecte to it
    }

    public async isReady(): Promise<boolean> {
        // this method will check if the services 
        // passed are connected and avaible
        return true;
    }

    public is_primary_service(): boolean {
        // this methodh wihch will answer by checkService function
        return true;
    }

    public async findAvailablePort(): Promise<void> {
        let initialPort = this.port + 1;
        // get al list of ports
        let availablePorts = await findAvailablePort(
            initialPort,
            initialPort + (this.services.length * 3),
        );
        // save the available ports
        this.availablePorts = availablePorts;
    }

}

export default Primary;
     
