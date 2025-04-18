import "../chunk-V6TY7KAL.js";
import PeerDiscoveryServer from "./peerDiscovery/index.js";
import makeProxyObject from "./makeProxyObject.js";
import Service from "../service/index.js";
import { isSlaveMethods, isMasterCallback } from "./typeGuards.js";
const entry = (entryOptions) => {
  let options = entryOptions;
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
  const port = globalOptions.port;
  const host = globalOptions.host;
  let service = new Service({
    service_name,
    peerDiscoveryAddress: { host, port },
    mastercallback,
    slaveMethods,
    options
  });
  service.start();
};
const paramertesDiscermination = (param1, param2, param3) => {
  let mastercallback, slaveMethods, options;
  if (isMasterCallback(param1)) {
    mastercallback = param1;
    if (isSlaveMethods(param2)) {
      slaveMethods = param2;
      options = param3 || {};
    }
  } else if (isSlaveMethods(param1)) {
    mastercallback = () => {
    };
    slaveMethods = param1;
    options = param2 || {};
  } else {
    throw new Error("Invalid first parameter. Must be either a funcition or an object");
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