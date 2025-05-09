import "../chunk-V6TY7KAL.js";
import PeerDiscoveryServer from "./peerDiscovery/index.js";
import makeProxyObject from "./makeProxyObject.js";
import Service from "../service/index.js";
import { isSlaveMethods, isMasterCallback } from "./typeGuards.js";
const default_host = "localhost";
const default_port = 3e3;
const entry = (entryOptions) => {
  let options = entryOptions;
  options.host = options.host || default_host;
  options.port = options.port || default_port;
  let proxyObject = makeProxyObject(handleProxyCall(options));
  let peerDiscoveryServer = new PeerDiscoveryServer({
    host: options.host,
    port: options.port
  });
  peerDiscoveryServer.start();
  return proxyObject;
};
const handleProxyCall = (globalOptions) => (method, param1, param2, param3) => {
  const { mastercallback, slaveMethods, options } = paramertesDiscermination(param1, param2, param3);
  if (mastercallback === void 0) throw new Error("Master callback is undefined");
  const service_name = method;
  const port = globalOptions.port || default_port;
  const host = globalOptions.host || default_host;
  const serviceOptions = {
    ...globalOptions,
    ...options,
    host: options.host,
    port: options.port
  };
  let service = new Service({
    service_name,
    peerDiscoveryAddress: { host, port },
    mastercallback,
    slaveMethods,
    options: serviceOptions
  });
  service.start();
};
const paramertesDiscermination = (param1, param2, param3) => {
  let mastercallback;
  let slaveMethods;
  let options;
  if (isMasterCallback(param1)) {
    mastercallback = param1;
    if (isSlaveMethods(param2)) {
      slaveMethods = param2;
      options = param3 || {};
    } else if (typeof param2 === "object") {
      options = param2;
      slaveMethods = {};
    } else if (param2 === void 0) {
      options = {};
      slaveMethods = {};
    } else {
      throw new Error(`Invalid second parameter of type of ${typeof param2}. Must be either an object of function, options or undefined`);
    }
  } else if (isSlaveMethods(param1)) {
    mastercallback = () => {
    };
    slaveMethods = param1;
    options = param2 || {};
  } else {
    throw new Error(`Invalid first parameter of type of ${typeof param1}. Must be either an function or an object of functions`);
  }
  return {
    mastercallback,
    slaveMethods,
    options
  };
};
var entry_default = entry;
export {
  entry_default as default
};
//# sourceMappingURL=entry.js.map