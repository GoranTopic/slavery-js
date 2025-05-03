import PeerDiscoveryServer from './peerDiscovery/index.js';
import makeProxyObject from './makeProxyObject.js';
import Service, { SlaveMethods, Options as ServiceOptions } from '../service/index.js';
import { isSlaveMethods, isMasterCallback } from './typeGuards.js';

type CallableFunction = (...args: any[]) => any;

type MasterCallback = Function | CallableFunction;

type EntryOptions = {
    host: string;
    port: number;
}

const entry = (entryOptions: EntryOptions) => {
    // this function is use to set up the options for the servies
    let options = entryOptions;
    // make a proxy object will take of creating each service
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


const handleProxyCall = (globalOptions: EntryOptions) => (
    // this are all of the possible input to service now the question is who to know 
    // which one wa passed
    method: string,
    param1: MasterCallback | SlaveMethods,
    param2?: SlaveMethods | ServiceOptions, 
    param3?: ServiceOptions) => {
        // first we check which function where passed
        const { mastercallback, slaveMethods, options } = paramertesDiscermination(param1, param2, param3);
        if(mastercallback === undefined) throw new Error('Master callback is undefined');
        // get the service name and the functions
        const service_name = method;
        // get the port and the host
        const port = globalOptions.port;
        const host = globalOptions.host;
        // make a new service
        let service = new Service({
            service_name,
            peerDiscoveryAddress: { host, port },
            mastercallback: mastercallback as CallableFunction,
            slaveMethods,
            options,
        })
        service.start()
    }

// this function will take the parameters and determine what they are
// and return them in a format that is easy to work with
const paramertesDiscermination = (param1: MasterCallback | SlaveMethods, param2?: SlaveMethods | ServiceOptions, param3?: ServiceOptions) => {
    let mastercallback: MasterCallback;
    let slaveMethods: SlaveMethods;
    let options: ServiceOptions;
    // check if the first paramet is either a MasterCallback or SlaveMethods
    if( isMasterCallback(param1) ) {
        mastercallback = param1;
        // check what the second paramter is
        if( isSlaveMethods(param2) ) {
            slaveMethods = param2;
            options = param3 || {};
        } else if( typeof param2 === 'object' ) {
            options = param2;
            slaveMethods = {};
        } else if(param2 === undefined ) {
            options = {};
            slaveMethods = {};
        }else{
            throw new Error(`Invalid second parameter of type of ${typeof param2}. Must be either an object of function, options or undefined`);
        }
    } else if( isSlaveMethods(param1) ) {
        mastercallback = () => {};
        slaveMethods = param1;
        // check what the second paramter is
        options = param2 || {};
    } else { 
        throw new Error(`Invalid first parameter of type of ${typeof param1}. Must be either an function or an object of functions`);
    }
    return { 
        mastercallback,
        slaveMethods,
        options
    }
}



export default  entry;
