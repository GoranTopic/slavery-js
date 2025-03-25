import Network, { Listener } from '../network';
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
    constructor(name: string, network: Network, options: Options = {}) {
        this.name = name;
        this.network = network;
        if(options.throwError === undefined) options.throwError = true;
        this.options = options;
        // get the conenction from the network
        let connection = this.network.getService(name);
        if(connection === null) throw new Error(`Service ${name} not found`);
        // get the listneres from the target connection
        this.listeners = connection.targetListeners;
        // create method from listners which run the query on the connection
        this.listeners.forEach((listener: Listener) => {
            (this as any)[listener.event] = 
                async (parameters: any) => await this.sendRequest(listener.event, { parameters });
        });
    }

    private async sendRequest(event: string, data: any) {
        // get the connection
        let connection = this.network.getService(this.name);
        // and send the data
        if (connection === null) throw new Error(`Service ${name} not found`);
        let response = await connection.send(event, data);
        // check if we got an error and handle it
        if (response.isError === true) 
            return this.handleErrors(response.error);
        return response.result;
    }

    private handleErrors(error_obj: Error) {
        // deserialize the error, handle according to the options
        let error = deserializeError(error_obj);
        if (this.options.throwError) throw error;
        if (this.options.logError) console.error(error);
        if (this.options.returnError) return error;
        else return null;
    }


    // We define a seperate method selecting 
    // a one or a group of nodes in a service
    public async select(num: number = 1) {
        // send server to select a node
        let selection = await this.sendRequest('_select', num);
        if(selection === null) return;
        // set the selection
        this.selection = selection;
        // override the listeners
        // create method from listners which run the query on the connection
        this.listeners.forEach((listener: Listener) => {
            (this as any)[listener.event] = 
                // if we have a selection we send a request to every node on the selection
                async (parameters: any) => await Promise.all(
                    this.selection.map(
                        async (nodeId: string) => await this.sendRequest(
                            listener.event, { parameters, selection: nodeId }
                        )
                    )
            )
        });
        // return this same object
        return this
    }
    
}

export default ServiceClient;
