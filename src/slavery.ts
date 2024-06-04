/*
import cluster_manager from './process_cluster';
import { master, logger, proxy, storage, primary } from './services';
import { slave, pipes } from './nodes';
import { service_manager } from './services';
*/


class Slavery {
    private master: Function | undefined;
    private logger: Function | undefined;
    private proxies: Function | undefined;
    private storage: Function | undefined;
    private primary: Function | undefined;
    private slaves: Function | undefined;
    private pipes: Function | undefined;
    // options
    private options: any;


    constructor(options: any) {
        // handle options
        this.options = options;
        // make network_handler
        this.network = new Network(this.options);
        // make cluster_handler
        this.cluster = new Cluster(this.options);
        // register possible services and nodes into this object
        this.master = this.initialize_services('master', this.options.master);
        this.logger = this.initialize_services('logger', this.options.logger);
        this.proxies = this.initialize_services('proxies', this.options.proxies);
        this.storage = this.initialize_services('storage', this.options.storage);
        this.slaves = this.initialize_nodes('slaves', this.options.slaves);
        this.pipes = this.initialize_nodes('pipes', this.options.pipes);
    }

    private initialize_services(service_name: string, options: any) {
        return async (service_callback: Function) => {
            // make a single new process on the cluster
            cluster.spawn(service_name);
            // uf we are in the correct process
            if(cluster.is(service_name)) {
                // initilize service connected it into the network
                //    when connected to the list of services 
                //    then run callback
                await service_callback();
                // make a new process from the callback
            }
        }


    private initialize_nodes(nodes_name, options: any) {
        // make a new process from the callback
        return async (node_callback: Function) => {
            // make a single new process
            // if process is correct then continue, else return
            // initilize service connected it into the network
            //    when connected to the list of services 
            //    then run callback
            await node_callback();
            // make a new process from the callback
        }
    }

}



export default process_init;
