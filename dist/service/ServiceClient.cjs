"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var ServiceClient_exports = {};
__export(ServiceClient_exports, {
  default: () => ServiceClient_default
});
module.exports = __toCommonJS(ServiceClient_exports);
var import_serialize_error = require("serialize-error");
class ServiceClient {
  // get the network from the connection
  constructor(name, network, options = {}, selection) {
    /* this class will be used to connect to a diffrent service,
     * it will convert the class into a client handler for other services
     * it will connect to the service and create methods
     * for every listener that the service has. */
    __publicField(this, "name");
    __publicField(this, "network");
    __publicField(this, "options");
    // this is use to select nodes
    __publicField(this, "selection", []);
    __publicField(this, "listeners", []);
    this.name = name;
    this.network = network;
    if (options.throwError === void 0) options.throwError = true;
    this.options = options;
    this.selection = selection || [];
    let connection = this.network.getService(name);
    if (connection === null) throw new Error(`Service ${name} not found`);
    this.listeners = connection.targetListeners;
    if (this.selection.length === 0) {
      this.listeners.forEach((listener) => {
        this[listener.event] = async (parameters) => await this.sendRequest(listener.event, { parameters });
      });
    } else {
      this.listeners.forEach((listener) => {
        this[listener.event] = // if we have a selection we send a request to every node on the selection
        async (parameters) => {
          let results = await Promise.all(
            this.selection.map(
              async (nodeId) => await this.sendRequest(
                listener.event,
                { parameters, selection: nodeId }
              )
            )
          );
          if (results.length === 1) return results[0];
          else return results;
        };
      });
    }
  }
  async sendRequest(event, data) {
    let connection = this.network.getService(this.name);
    if (connection === null) throw new Error(`Service ${this.name} not found`);
    let response = await connection.send(event, data);
    if (response.isError === true)
      return this.handleErrors(response.error);
    return response.result;
  }
  // We define a seperate method selecting 
  // a one or a group of nodes in a service
  async select(num) {
    if (num === void 0) num = 1;
    if (num === "all") num = 0;
    let selection = await this.sendRequest("_select", { parameters: num });
    if (selection === null) return;
    return new ServiceClient(this.name, this.network, this.options, selection);
  }
  async exec(code) {
    if (this.selection.length === 0) {
      return await this.sendRequest("_exec", { parameters: code.toString() });
    } else {
      let results = await Promise.all(
        this.selection.map(
          async (nodeId) => await this.sendRequest(
            "_exec",
            { parameters: code.toString(), selection: nodeId }
          )
        )
      );
      if (results.length === 1) return results[0];
      else return results;
    }
  }
  async exec_master(code) {
    return await this.sendRequest("_exec_master", { parameters: code.toString() });
  }
  handleErrors(error_obj) {
    let error = (0, import_serialize_error.deserializeError)(error_obj);
    if (this.options.throwError) throw error;
    if (this.options.logError) console.error(error);
    if (this.options.returnError) return error;
    else return null;
  }
}
var ServiceClient_default = ServiceClient;
//# sourceMappingURL=ServiceClient.cjs.map