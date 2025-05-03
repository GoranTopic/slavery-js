"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var entry_exports = {};
__export(entry_exports, {
  default: () => entry_default
});
module.exports = __toCommonJS(entry_exports);
var import_peerDiscovery = __toESM(require("./peerDiscovery/index.js"), 1);
var import_makeProxyObject = __toESM(require("./makeProxyObject.js"), 1);
var import_service = __toESM(require("../service/index.js"), 1);
var import_typeGuards = require("./typeGuards.js");
const entry = (entryOptions) => {
  let options = entryOptions;
  let proxyObject = (0, import_makeProxyObject.default)(handleProxyCall(options));
  let peerDiscoveryServer = new import_peerDiscovery.default({
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
  let service = new import_service.default({
    service_name,
    peerDiscoveryAddress: { host, port },
    mastercallback,
    slaveMethods,
    options
  });
  service.start();
};
const paramertesDiscermination = (param1, param2, param3) => {
  let mastercallback;
  let slaveMethods;
  let options;
  if ((0, import_typeGuards.isMasterCallback)(param1)) {
    mastercallback = param1;
    if ((0, import_typeGuards.isSlaveMethods)(param2)) {
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
  } else if ((0, import_typeGuards.isSlaveMethods)(param1)) {
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
//# sourceMappingURL=entry.cjs.map