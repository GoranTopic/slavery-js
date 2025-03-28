import Service from '../service';


/* 
 * @param {string} ip - the ip of the service discovery service
 * @param {string} host - the host of the service discovery service
 * @returns {Service} - the service object of the service discovery service
 */

const ServiceDiscoveryService = (ip: string, host: string): Service => {
    // This function will return the service object of the service discovery service
    // this will have the logic for registering services and disvoring them on the network 
    // by other services peers
    return new Service({
        service_name: 'ServiceDiscoveryService',
        peerServicesAddresses: [],
        mastercallback: () => {},
        slaveMethods: {
            registerService: () => {},
            discoverService: () => {},
            getServices: () => {}
        },
    });
}

const mastercallback = (service: Service) => {
    // create a list of services
    //





export default ServiceContainer;
