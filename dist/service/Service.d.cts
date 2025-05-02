import ServiceAddress from './types/ServiceAddress.cjs';
import SlaveMethods from './types/SlaveMethods.cjs';
import Options from './types/Options.cjs';

type Parameters = {
    service_name: string;
    peerServicesAddresses?: ServiceAddress[];
    peerDiscoveryAddress?: {
        host: string;
        port: number;
    };
    mastercallback?: (...args: any[]) => any;
    slaveMethods?: SlaveMethods;
    options?: Options;
};
declare class Service {
    name: string;
    host: string;
    port: number;
    private nodes?;
    private stash;
    private processBalancer?;
    private requestQueue;
    nm_host: string;
    nm_port: number;
    number_of_nodes: number;
    private masterCallback?;
    private slaveMethods;
    private peerAddresses;
    private peerDiscoveryAddress?;
    private peerDiscovery?;
    private cluster?;
    private network?;
    private options;
    private servicesConnected;
    constructor(params: Parameters);
    start(): Promise<void>;
    private initialize_master;
    private initialize_slaves;
    private initlize_node_manager;
    private initialize_request_queue;
    private initialize_process_balancer;
    private getServiceListeners;
    private handle_request;
    private handle_peer_discovery;
    private getServices;
    exit(): boolean;
    set: (key: any, value?: any) => Promise<void>;
    get: (key?: string) => Promise<any>;
}

export { Service as default };
