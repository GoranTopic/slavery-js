import Service from '../service';
import ServiceOptions from './types';
import { ServiceAddress } from '../service';
import { getPort } from '../utils';

type Parameters = {
    service_name: string;
    ip: string;
    host: string;
    options: ServiceOptions;
};

class ServiceContainer {
    /* This class will work as a conatiner for the servie.
     * it will work as wrapper for the service class, and will
     * looks for a list of other services on the network. 
     * it starts the service, and stops it. 
     * It process the functions passed by the service before hand
     * to check for conflicting varibale names. it also checks for 
     * the services this service will use,
     */
    public sevice_name: string;
    public sds_ip: string; // Service Dicovery Service ip
    public sds_host: string; // Service Discovery Service host
    public service: Service;
    private options: ServiceOptions;

    constructor(params: Parameters) {
        this.sds_ip = params.ip;
        this.sds_host = params.host;
        this.service_name = params.service_name;
        this.mastercallback = params.options.mastercallback;

        // create a service based on the paramters passed
        this.service = new Service({
    // the name of the service
    service_name: string,
    // the address of the service will take
    peerServicesAddresses: ServiceAddress[],
    // the master callback that will be called by the master process
    mastercallback?: (...args: any[]) => any,
    // the slave callbacks that will be called by the slaves
    slaveMethods?: SlaveMethods,
    // the options that will be passed to the service
    options: Options
        // check if there is a service running on the sds_ip and sds_host
        
        // if not, start the service

        this.sevice_name = params.service_name;

    }

}



export default ServiceContainer;
