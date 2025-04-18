import Network, { Listener } from '../network/index.js';
import { deserializeError } from 'serialize-error';

type Options = {
    throwError?: boolean,
    returnError?: boolean,
    logError?: boolean
}


class ServiceClient {
    /* this class will be used to connect to a diffrent service,
     * it will convert the class into a client handler for other services
     * it will connect to the service and create methods
     * for every listener that the service has. */
    public name: string;
    public network: Network;
    public options: Options;
    // this is use to select nodes
    public selection: string[] = []; 
    private listeners: Listener[] = [];
    // get the network from the connection
    constructor(name: string, network: Network, options: Options = {}, selection?: [] ) {
        this.name = name;
        this.network = network;
        if(options.throwError === undefined) options.throwError = true;
        this.options = options;
        this.selection = selection || [];
        // get the conenction from the network
        let connection = this.network.getService(name);
        if(connection === null) throw new Error(`Service ${name} not found`);
        // get the listneres from the target connection
        this.listeners = connection.targetListeners;
        // if we have a selection
        if(this.selection.length === 0) {
            // create method from listners which run the query on the connection
            this.listeners.forEach((listener: Listener) => {
                (this as any)[listener.event] = 
                    async (parameters: any) => await this.sendRequest(listener.event, { parameters });
            });
        }else{
            // create method from listners which run the query on the connection
            this.listeners.forEach((listener: Listener) => {
                (this as any)[listener.event] = 
                    // if we have a selection we send a request to every node on the selection
                    async (parameters: any) => {
                    let results = await Promise.all(
                        this.selection.map(
                            async (nodeId: string) => await this.sendRequest(
                                listener.event, { parameters, selection: nodeId }
                            )
                        )
                    )
                    // if we only have one node we return the result
                    if(results.length === 1) return results[0];
                    else return results;
                }
            });
        }
    }

    private async sendRequest(event: string, data: any) {
        // get the connection
        let connection = this.network.getService(this.name);
        // and send the data
        if (connection === null) throw new Error(`Service ${this.name} not found`);
        let response = await connection.send(event, data);
        // check if we got an error and handle it
        if (response.isError === true) 
            return this.handleErrors(response.error);
        return response.result;
    }


    // We define a seperate method selecting 
    // a one or a group of nodes in a service
    public async select(num?: number | 'all') {
        // undefined selects all nodes
        if(num === undefined) num = 1
        if(num === 'all') num = 0
        // send server to select a node
        let selection = await this.sendRequest('_select', { parameters: num });
        // check if we got an error and handle it
        if(selection === null) return;
        // set the selection
        return new ServiceClient(this.name, this.network, this.options, selection);
    }

    public async exec(code: string) {
        // execute albitrary code on the a node
        if(this.selection.length === 0) {
            return await this.sendRequest('_exec', { parameters: code.toString() });
        } else {
            // if we have selection we send a request to every node on the selection
           let results = await Promise.all(
                this.selection.map(
                    async (nodeId: string) => await this.sendRequest(
                        '_exec', { parameters: code.toString(), selection: nodeId }
                    )
                )
            );
            // if we only have one node we return the result
            if(results.length === 1) return results[0];
            else return results;
        }
    }


    public async exec_master(code: string) {
        // execute albitrary code on the master node
        return await this.sendRequest('_exec_master', { parameters: code.toString() });
    }

    private handleErrors(error_obj: Error) {
        // deserialize the error, handle according to the options
        let error = deserializeError(error_obj);
        if (this.options.throwError) throw error;
        if (this.options.logError) console.error(error);
        if (this.options.returnError) return error;
        else return null;
    }
    
}

export default ServiceClient;
