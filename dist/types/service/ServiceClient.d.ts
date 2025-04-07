import Network from '../network';
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
export default ServiceClient;
