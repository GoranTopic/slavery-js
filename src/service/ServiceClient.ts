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
    // get the network from the connection
    constructor(name: string, network: Network, options: Options = {}) {
        this.name = name;
        this.network = network;
        if(options.throwError === undefined)
            options.throwError = true;
        this.options = options;
        // get the conenction from the network
        let connection = this.network.getService(name);
        // get the listneres from the target connection
        let listeners = connection.targetListeners;
        // create method from listners which run the query on the connection
        listeners.forEach((listener: Listener) => {
            (this as any)[listener.event] = async (data: any) => {
                // get the connection
                let connection = this.network.getService(this.name);
                // and send the data
                let response = await connection.send(listener.event, data);
                // check if we got an error and handle it
                if (response.isError === true) {
                    let error = deserializeError(response.error);
                    if (this.options.throwError) throw error;
                    if (this.options.logError) console.error(error);
                    if (this.options.returnError) return error;
                    else return null;
                }
                return response;
            }
        });
    }
}

export default ServiceClient;
