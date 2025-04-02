import PeerDiscoveryServer from '../peerDiscovery';
import makeProxyObject from './makeProxyObject';
import extractFunctions from './extractFunctions';
import Service from '../service';
//import type { 

type callableFunction = (...args: any[]) => any;

type EntryOptions = {
    host: string;
    port: number;
}

const entry = (entryOptions: EntryOptions) => {
    // this function is use to set up the options for the servies
    let options = entryOptions;
    // make a proxy object will take of xreating each service
    let proxyObject = makeProxyObject(handleProxyCall(options));
    // make the peer discovery server
    let peerDiscoveryServer = new PeerDiscoveryServer({
        host: options.host,
        port: options.port,
    });
    peerDiscoveryServer.start();
    // return the proxy object
    return proxyObject; // <--- the proxy obj will return itself in perpituity
}

const handleProxyCall = (globalOptions: EntryOptions) => 
(function_name: string, fn: string, options: any) => {
    // get the service name and the functions
    const service_name = function_name;
    const paresed = extractFunctions(fn);
    const mastercallback = paresed.outer_function;
    const slaveMethods = paresed.inner_functions
    .reduce((acc: any, curr: any) => {
        acc[curr.name] = curr.fn;
        return acc;
    }, {});
    // get the port and the host
    const port = globalOptions.port;
    const host = globalOptions.host;
    // make a new service
    let service = new Service({
        service_name,
        peerDiscoveryAddress: { name: 'peer-discovery-service', host, port },
        mastercallback: mastercallback as callableFunction,
        slaveMethods,
        options,
    })
    service.start()
}




export default  entry;
