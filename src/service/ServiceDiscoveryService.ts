import Service, { ServiceAddress } from '../service/index.js';


/* 
 * @param {string} ip - the ip of the service discovery service
 * @param {string} host - the host of the service discovery service
 * @returns {Service} - the service object of the service discovery service
 */

const ServiceDiscoveryService = (host: string, port: string): Service => {
    // This function will return the service object of the service discovery service
    // this will have the logic for registering services and disvoring them on the network 
    // by other services peers
    return new Service({
        service_name: 'ServiceDiscoveryService',
        peerServicesAddresses: [],
        mastercallback,
        slaveMethods: {
            registerService,
            getServices,
        },
        options: { 
            host, 
            port: parseInt(port) 
        },
    });
}

const mastercallback = async ({ self }: { self: Service }) => {
    // create a list of services
    await self.set([]); // set the list of services
}

// register a service
const registerService = async (service: ServiceAddress, { self }: { self: Service, service: Service }) => {
    let services = await self.get();
    services.push(service);
    await self.set(services);
    return 'ok';
}
    
// get the list of services
const getServices = async (params: any, { self }: { self: Service }) => {
    return await self.get();
}


export default ServiceDiscoveryService;
