"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = __importDefault(require("./peerDiscovery/index.js"));
const makeProxyObject_js_1 = __importDefault(require("./makeProxyObject.js"));
const index_js_2 = __importDefault(require("../service/index.js"));
const typeGuards_js_1 = require("./typeGuards.js");
const entry = (entryOptions) => {
    // this function is use to set up the options for the servies
    let options = entryOptions;
    // make a proxy object will take of xreating each service
    let proxyObject = (0, makeProxyObject_js_1.default)(handleProxyCall(options));
    // make the peer discovery server
    let peerDiscoveryServer = new index_js_1.default({
        host: options.host,
        port: options.port,
    });
    peerDiscoveryServer.start();
    // return the proxy object
    return proxyObject; // <--- the proxy obj will return itself in perpituity
};
const handleProxyCall = (globalOptions) => (
// this are all of the possible input to service now the question is who to know 
// which one wa passed
method, param1, param2, param3) => {
    // first we check which function where passed
    const { mastercallback, slaveMethods, options } = paramertesDiscermination(param1, param2, param3);
    if (mastercallback === undefined)
        throw new Error('Master callback is undefined');
    // get the service name and the functions
    const service_name = method;
    // get the port and the host
    const port = globalOptions.port;
    const host = globalOptions.host;
    // make a new service
    let service = new index_js_2.default({
        service_name,
        peerDiscoveryAddress: { host, port },
        mastercallback: mastercallback,
        slaveMethods,
        options,
    });
    service.start();
};
const paramertesDiscermination = (param1, param2, param3) => {
    let mastercallback, slaveMethods, options;
    // check if the first paramet is either a MasterCallback or SlaveMethods
    if ((0, typeGuards_js_1.isMasterCallback)(param1)) {
        mastercallback = param1;
        // check what the second paramter is
        if ((0, typeGuards_js_1.isSlaveMethods)(param2)) {
            slaveMethods = param2;
            options = param3 || {};
        }
    }
    else if ((0, typeGuards_js_1.isSlaveMethods)(param1)) {
        mastercallback = () => { };
        slaveMethods = param1;
        // check what the second paramter is
        options = param2 || {};
    }
    else {
        throw new Error('Invalid first parameter. Must be either a funcition or an object');
    }
    return {
        mastercallback,
        slaveMethods,
        options
    };
};
exports.default = entry;
//# sourceMappingURL=entry.js.map