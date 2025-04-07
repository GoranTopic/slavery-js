import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import { deserializeError } from "serialize-error";
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
    let error = deserializeError(error_obj);
    if (this.options.throwError) throw error;
    if (this.options.logError) console.error(error);
    if (this.options.returnError) return error;
    else return null;
  }
}
var ServiceClient_default = ServiceClient;
export {
  ServiceClient_default as default
};
//# sourceMappingURL=ServiceClient.js.map