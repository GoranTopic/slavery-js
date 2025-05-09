"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var Node_exports = {};
__export(Node_exports, {
  default: () => Node_default
});
module.exports = __toCommonJS(Node_exports);
var import_network = __toESM(require("../network/index.js"), 1);
var import_service = require("../service/index.js");
var import_utils = require("../utils/index.js");
var import_serialize_error = require("serialize-error");
class Node {
  // takes and empty parameter or a object with the propertie methods
  constructor(params) {
    __publicField(this, "mode");
    __publicField(this, "id");
    __publicField(this, "status", "idle");
    __publicField(this, "listeners", []);
    __publicField(this, "lastUpdateAt", Date.now());
    __publicField(this, "master_host");
    __publicField(this, "master_port");
    __publicField(this, "network");
    __publicField(this, "servicesConnected", false);
    __publicField(this, "hasStartupFinished", false);
    // fields when the class is client handler on a service
    __publicField(this, "statusChangeCallback", null);
    // stash changes functions
    __publicField(this, "stashSetFunction", null);
    __publicField(this, "stashGetFunction", null);
    // fields when the class is a service handler on a node
    __publicField(this, "services", []);
    __publicField(this, "doneMethods", {});
    __publicField(this, "methods", {});
    // options
    __publicField(this, "options", {
      timeout: 1e4
    });
    /* this function will work on any mode the class is on */
    __publicField(this, "getId", () => this.id);
    __publicField(this, "getStatus", () => this.status);
    __publicField(this, "lastHeardOfIn", () => Date.now() - this.lastUpdateAt);
    __publicField(this, "isIdle", () => this.status === "idle");
    __publicField(this, "isWorking", () => this.status === "working");
    __publicField(this, "isError", () => this.status === "error");
    __publicField(this, "updateLastHeardOf", () => this.lastUpdateAt = Date.now());
    __publicField(this, "updateStatus", (status) => this.status = status);
    __publicField(this, "untilFinish", async () => {
      await (0, import_utils.await_interval)({
        condition: () => this.isIdle(),
        interval: 100
      }).catch(() => {
        throw new Error("The node is not idle");
      });
      return true;
    });
    __publicField(this, "start", async () => {
      if (this.mode === "client") return await this.start_client();
      else if (this.mode === "server") return await this.start_server();
    });
    __publicField(this, "run", async (method, parameter) => {
      if (this.mode === "client") return await this.run_client({ method, parameter });
      else if (this.mode === "server") return await this.run_server({ method, parameter });
    });
    __publicField(this, "exec", async (method, code) => {
      if (this.mode === "client") return await this.exec_client(code);
      else if (this.mode === "server") return await this.exec_server(code);
    });
    __publicField(this, "setServices", async (services) => {
      if (this.mode === "client") return await this.setServices_client(services);
      else if (this.mode === "server") return await this.setServices_server(services);
    });
    __publicField(this, "exit", async () => {
      if (this.mode === "client") return await this.exit_client();
      else if (this.mode === "server") return await this.exit_server();
    });
    __publicField(this, "ping", async () => {
      if (this.mode === "client") return await this.ping_client();
      else if (this.mode === "server") return await this.ping_server();
    });
    // this function will communicate with the master node and set the stash in that moment
    __publicField(this, "setStash", async (key, value = null) => await this.send("_set_stash", { key, value }));
    __publicField(this, "getStash", async (key = "") => await this.send("_get_stash", key));
    /* method synonims */
    __publicField(this, "isBusy", this.isWorking);
    __publicField(this, "hasFinished", this.hasDone);
    __publicField(this, "hasError", this.isError);
    __publicField(this, "toFinish", this.untilFinish);
    __publicField(this, "set", this.setStash);
    __publicField(this, "get", this.getStash);
    __publicField(this, "stash", this.setStash);
    __publicField(this, "unstash", this.getStash);
    this.mode = params.mode;
    if (this.mode === "client") {
      params = params;
      this.master_host = params.master_host;
      this.master_port = params.master_port;
      this.services = params.services || [];
      this.options = params.options || {};
      this.addMethods(params.methods);
    } else if (this.mode === "server") {
      params = params;
      this.setStashFunctions({ set: params.stashSetFunction, get: params.stashGetFunction });
      this.setNodeConnection(params.connection, params.network);
      this.services = params.services;
      this.statusChangeCallback = params.statusChangeCallback;
    }
  }
  /* this functions will set the Node.ts as a client handler for the server */
  setNodeConnection(connection, network) {
    this.id = connection.getTargetId();
    this.network = network;
    if (this.stashSetFunction === null || this.stashGetFunction === null)
      throw new Error("The stash functions have not been set");
    this.listeners = [
      //  this callbacks will run when we recive this event from the client node
      { event: "_set_status", parameters: ["status"], callback: this.handleStatusChange.bind(this) },
      { event: "_ping", parameters: [], callback: () => "_pong" },
      { event: "_set_stash", parameters: ["key", "value"], callback: this.stashSetFunction },
      { event: "_get_stash", parameters: ["key"], callback: this.stashGetFunction },
      { event: "_get_services_address", parameters: [], callback: () => this.services }
    ];
    connection.setListeners(this.listeners);
  }
  setStatusChangeCallback(callback) {
    this.statusChangeCallback = callback;
  }
  setStashFunctions({ set, get }) {
    this.stashSetFunction = ({ key, value }) => set(key, value);
    this.stashGetFunction = get;
  }
  handleStatusChange(status) {
    this.updateStatus(status);
    this.statusChangeCallback && this.statusChangeCallback(status, this);
  }
  lastHeardOf() {
    this.updateLastHeardOf();
    return this.lastHeardOfIn();
  }
  async start_server() {
    let response = await this.setServices_server(this.services);
    if (response === true) {
      this.servicesConnected = true;
      return true;
    } else
      throw new Error(`slavery-js: [Node][${this.id}] Could not set services on the client node`);
  }
  async run_server({ method, parameter }) {
    this.handleStatusChange("working");
    let res = await this.send("_run", { method, parameter });
    this.handleStatusChange("idle");
    if (res.isError === true)
      res.error = (0, import_serialize_error.deserializeError)(res.error);
    return res;
  }
  async exec_server(code) {
    try {
      this.handleStatusChange("working");
      let res = await this.send("_exec", code);
      this.handleStatusChange("idle");
      if (res.isError === true)
        res.error = (0, import_serialize_error.deserializeError)(res.error);
      return res;
    } catch (error) {
      this.handleStatusChange("idle");
      (0, import_utils.log)(`[Node][${this.id}] Error in exec_server: ${error}`);
      return { isError: true, error: (0, import_serialize_error.serializeError)(error) };
    }
  }
  async setServices_server(services) {
    try {
      return await this.send("_set_services", services);
    } catch (error) {
      (0, import_utils.log)(`[Node][${this.id}] Error in setServices_server: ${error}`);
      throw error;
    }
  }
  async ping_server() {
    try {
      let res = await this.send("_ping");
      if (res === "pong") this.updateLastHeardOf();
      return true;
    } catch (error) {
      (0, import_utils.log)(`[Node][${this.id}] Error in ping_server: ${error}`);
      return false;
    }
  }
  async exit_server() {
    try {
      let res = await this.send("_exit", null).catch((error) => {
        if (error === "timeout") return true;
        (0, import_utils.log)(`[Node][${this.id}] Error in exit_server: ${error}`);
        return false;
      });
      return res;
    } catch (error) {
      (0, import_utils.log)(`[Node][${this.id}] Error in exit_server: ${error}`);
      return false;
    }
  }
  async send(method, parameter = null) {
    if (this.network === void 0) throw new Error("The network has not been set");
    if (this.id === void 0) throw new Error("The id has not been set");
    if (this.mode === void 0) throw new Error("The mode has not been set");
    let connection = void 0;
    if (this.mode === "server")
      connection = this.network.getNode(this.id);
    else if (this.mode === "client")
      connection = this.network.getService("master");
    if (connection === void 0)
      throw new Error("Could not get the conenction from the network");
    return await connection.send(method, parameter);
  }
  /* this function will be called when the client node tells us that it is working */
  async start_client() {
    this.id = this.id || Math.random().toString(36).substring(4);
    this.network = new import_network.default({
      name: "node",
      id: this.id,
      options: {
        timeout: this.options.timeout || 5 * 60 * 1e3
      }
    });
    if (this.master_host === void 0 || this.master_port === void 0)
      throw new Error("The master host and port have not been set");
    this.network.connect({ host: this.master_host, port: this.master_port, as: "master" });
    this.listeners = [
      { event: "_run", parameters: ["method", "parameter"], callback: this.run_client.bind(this) },
      { event: "_exec", parameters: ["code_string"], callback: this.exec_client.bind(this) },
      { event: "_set_services", parameters: ["services"], callback: this.setServices_client.bind(this) },
      { event: "_is_idle", parameters: [], callback: this.isIdle.bind(this) },
      { event: "_is_busy", parameters: [], callback: this.isBusy.bind(this) },
      { event: "_has_done", parameters: ["method"], callback: this.hasDone.bind(this) },
      { event: "_ping", parameters: [], callback: () => "pong" },
      { event: "_exit", parameters: [], callback: this.exit_client.bind(this) }
    ];
    this.network.registerListeners(this.listeners);
    await (0, import_utils.await_interval)({
      condition: () => this.servicesConnected,
      timeout: 1e3
    }).catch(async () => {
      let services = await this.get_sevices_address();
      this.setServices_client(services);
    });
    await this.run_startup();
  }
  async run_client({ method, parameter }) {
    await (0, import_utils.await_interval)({
      condition: () => this.servicesConnected,
      timeout: 1e4,
      interval: 10
    }).catch(() => {
      throw new Error(`slavery-js: [Node][${this.id}] run method, because it could not connect to services`);
    });
    await (0, import_utils.await_interval)({
      condition: () => this.hasStartupFinished,
      timeout: 60 * 1e3,
      interval: 1
    }).catch(() => {
      throw new Error(`slavery-js: [Node][${this.id}] run method, because the startup method did not finish`);
    });
    await (0, import_utils.await_interval)({
      condition: () => this.isIdle(),
      timeout: 60 * 1e3,
      interval: 1
    }).catch(() => {
      throw new Error(`slavery-js: [Node][${this.id}] run method, because the node timed for becoming idle`);
    });
    try {
      this.updateStatus("working");
      let services = await this.get_services();
      let services_params = { ...services, slave: this, self: this };
      const result = await this.methods[method](parameter, services_params);
      this.doneMethods[method] = true;
      return { result, isError: false };
    } catch (error) {
      this.updateStatus("error");
      return { error: (0, import_serialize_error.serializeError)(error), isError: true };
    } finally {
      this.updateStatus("idle");
    }
  }
  async exec_client(code_string) {
    if (typeof code_string !== "string")
      return { isError: true, error: (0, import_serialize_error.serializeError)(new Error("Code string is not a string")) };
    await (0, import_utils.await_interval)({
      condition: () => this.servicesConnected,
      timeout: 20 * 1e3
    }).catch(() => {
      throw new Error(`slavery-js: [Node][${this.id}] executing code, because it could not connect to services`);
    });
    let services = await this.get_services();
    let parameter = { ...services, slave: this, self: this };
    try {
      let result = await (0, import_utils.execAsyncCode)(code_string, parameter);
      return { result, isError: false };
    } catch (e) {
      return { isError: true, error: (0, import_serialize_error.serializeError)(e) };
    }
  }
  async run_startup() {
    await (0, import_utils.await_interval)({
      condition: () => this.servicesConnected,
      timeout: 20 * 1e3
    }).catch(() => {
      throw new Error(`slavery-js: [Node][${this.id}] Could not startup Node becasue it could not connect to services`);
    });
    if (this.methods["_startup"] === void 0) {
      this.hasStartupFinished = true;
      return true;
    }
    try {
      let services = await this.get_services();
      let parameter = { ...services, slave: this, self: this };
      const result = await this.methods["_startup"](null, parameter);
      this.doneMethods["_startup"] = true;
      this.hasStartupFinished = true;
      return { result, isError: false };
    } catch (error) {
      this.updateStatus("error");
      throw new Error(`[Node][${this.id}] Could not run startup method: ${error}`);
    }
  }
  async get_services() {
    let services = this.services.map(
      (s) => new import_service.ServiceClient(s.name, this.network)
    ).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
    return services;
  }
  addMethods(methods) {
    this.methods = methods;
    for (let method in methods)
      this.doneMethods[method] = false;
  }
  async setServices_client(services) {
    this.services = services;
    for (let service of services) {
      let res = await this.connectService(service);
      if (!res) {
        console.error("slavery-js: [Node] Client could not connect to the service, ", service.name);
        return false;
      } else
        (0, import_utils.log)(`[Node][${this.id}] Connected to the service, ${service.name}`);
    }
    this.servicesConnected = true;
    return true;
  }
  async connectService({ name, host, port }) {
    if (!host || !port)
      throw new Error("The service information is not complete");
    if (this.network === void 0)
      throw new Error("The network has not been set");
    return await this.network.connect({ name, host, port });
  }
  async get_sevices_address() {
    let res = await this.send("_get_services_address");
    this.services = res;
    return res;
  }
  async ping_client() {
    let res = await this.send("_ping");
    if (res === "_pong") this.updateLastHeardOf();
    return true;
  }
  async exit_client() {
    setTimeout(async () => {
      if (this.methods["_cleanup"] !== void 0)
        await this.run_client({ method: "_cleanup", parameter: null });
      if (this.network !== void 0) this.network.close();
      process.exit(0);
    }, 1e3);
    return true;
  }
  getListeners() {
    if (this.network === void 0) throw new Error("The network has not been set");
    if (this.id === void 0) throw new Error("The id has not been set");
    let listeners = [];
    let connection = void 0;
    if (this.mode === "server") {
      connection = this.network.getNode(this.id);
      listeners = connection.getListeners();
    } else if (this.mode === "client") {
      connection = this.network.getNode("master");
      listeners = connection.getListeners();
      if (connection === void 0)
        throw new Error("Could not get the conenction from the network");
    }
    return listeners;
  }
  hasDone(method) {
    return this.doneMethods[method] || false;
  }
}
var Node_default = Node;
//# sourceMappingURL=Node.cjs.map