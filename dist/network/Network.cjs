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
var Network_exports = {};
__export(Network_exports, {
  default: () => Network_default
});
module.exports = __toCommonJS(Network_exports);
var import_Connection = __toESM(require("./Connection.js"), 1);
var import_utils = require("../utils/index.js");
var import_Server = __toESM(require("./Server.js"), 1);
class Network {
  constructor({ name = "", id = void 0, options }) {
    /* *
     * this class will handle the connections of a node in the network.
     * this node can be in either a server or a client.
     * in a server it will have a Server instance and it will handle the nodes connections
     * in a client it will have a pool of connections to other servers
     * Each Node will have a NetworkNode
     * */
    __publicField(this, "id");
    // this is where a node store its server,
    // which in turn stores its connections to clients
    __publicField(this, "server");
    __publicField(this, "name");
    __publicField(this, "listeners");
    // this is where we store our connections to servers
    __publicField(this, "connections");
    // callback for when a new service connection is made
    __publicField(this, "serviceConnectionCallback");
    // callback for when a service disconnects
    __publicField(this, "serviceDisconnectCallback");
    // callback for when a new listener is added
    __publicField(this, "newListenersCallback");
    __publicField(this, "timeout");
    this.name = name;
    this.listeners = [];
    this.id = id || (0, import_utils.uuid)();
    this.server = null;
    this.connections = new import_utils.Pool();
    this.serviceConnectionCallback = void 0;
    this.serviceDisconnectCallback = void 0;
    this.newListenersCallback = void 0;
    this.timeout = options?.timeout || 5 * 60 * 1e3;
  }
  async connect({ name, host, port, as }) {
    const connection = new import_Connection.default({
      name: this.name,
      host,
      port,
      id: this.id,
      options: {
        timeout: this.timeout,
        onSetListeners: this.newListenersCallback
      }
    });
    await connection.connected();
    let server_name = connection.getTargetName();
    if (server_name === void 0)
      throw new Error("Server name is undefined");
    if (name !== void 0) {
      if (server_name !== name)
        throw new Error(`Server name mismatch: ${server_name} !== ${name}`);
    }
    if (as !== void 0) server_name = as;
    if (this.connections.has(server_name)) {
      let conn = this.connections.remove(server_name);
      conn && conn.close();
    }
    connection.setListeners(this.listeners);
    this.connections.add(server_name, connection);
    this.serviceConnectionCallback && this.serviceConnectionCallback(connection);
    return connection;
  }
  async connectAll(services) {
    (0, import_utils.log)(`[Network][${this.name}] connecting to all services`, services);
    let connections = await Promise.all(services.map(
      async (service) => await this.connect({
        name: service.name,
        host: service.host,
        port: service.port
      })
    )).catch((err) => {
      (0, import_utils.log)(`[Network][${this.name}] error connecting to services:`, err);
      return [];
    });
    return connections;
  }
  createServer(name, host, port, listeners = []) {
    this.server = new import_Server.default({ name, host, port, listeners });
  }
  close() {
    if (this.server) {
      this.server.close();
    }
    this.connections.toArray().forEach((connection) => {
      connection.close();
    });
  }
  getService(name) {
    let service = this.connections.get(name);
    if (service === null)
      throw new Error(`Service ${name} not found for ${this.name}`);
    return service;
  }
  getServices() {
    return this.connections.toArray();
  }
  getNode(id) {
    if (this.server === null) throw new Error("Server is not created");
    let client = this.server.getClient(id);
    if (client === null) throw new Error("Client not found");
    return client;
  }
  getNodes() {
    let nodes = this.server?.getClients().filter((conn) => conn.targetType === "client");
    return nodes || [];
  }
  getConnections() {
    return this.connections.toArray().concat(this.server?.getClients() || []);
  }
  closeService(name) {
    let connection = this.connections.remove(name);
    if (connection) connection.close();
    this.serviceDisconnectCallback && this.serviceDisconnectCallback(connection);
  }
  closeConnection(id) {
    let connection = this.connections.remove(id);
    if (connection) connection.close();
  }
  registerListeners(listeners) {
    this.listeners = listeners;
    if (this.server) this.server.setListeners(this.listeners);
    this.connections.toArray().forEach((connection) => {
      connection.setListeners(listeners);
    });
  }
  addListeners(listeners) {
    this.listeners = this.listeners.concat(listeners);
    if (this.server) this.server.addListeners(listeners);
    this.connections.toArray().forEach((connection) => {
      connection.addListeners(listeners);
    });
  }
  getRegisteredListeners() {
    let server_listeners = this.server?.getListeners() || [];
    let connections_listeners = this.connections.toArray().map((connection) => {
      (0, import_utils.log)("inside loop conenction:", connection);
      return { id: connection.id, listeners: connection.getListeners() };
    });
    return { server: server_listeners, connections: connections_listeners };
  }
  /* callbacks */
  onNodeConnection(callback) {
    if (this.server === null) throw new Error("Server is not created");
    this.server.onConnection(callback);
  }
  onNodeDisconnect(callback) {
    if (this.server === null) throw new Error("Server is not created");
    this.server.onDisconnect(callback);
  }
  onServiceConnection(callback) {
    this.serviceConnectionCallback = callback;
  }
  onServiceDisconnect(callback) {
    this.serviceDisconnectCallback = callback;
  }
  onNewListeners(callback) {
    this.newListenersCallback = callback;
  }
}
var Network_default = Network;
//# sourceMappingURL=Network.cjs.map