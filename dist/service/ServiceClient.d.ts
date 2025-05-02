import Network from '../network/Network.js';
import '../network/Connection.js';
import 'socket.io';
import '../network/types/Listener.js';
import '../utils/Pool.js';
import '../network/Server.js';
import 'http';

type Options = {
    throwError?: boolean;
    returnError?: boolean;
    logError?: boolean;
};
declare class ServiceClient {
    name: string;
    network: Network;
    options: Options;
    selection: string[];
    private listeners;
    constructor(name: string, network: Network, options?: Options, selection?: []);
    private sendRequest;
    select(num?: number | 'all'): Promise<ServiceClient | undefined>;
    exec(code: string): Promise<any>;
    exec_master(code: string): Promise<any>;
    private handleErrors;
}

export { ServiceClient as default };
