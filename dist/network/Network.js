import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import Connection from "./Connection.js";
import { uuid, log, Pool } from "../utils/index.js";
import Server from "./Server.js";
class Network {
  constructor({ name = "", id = void 0 }) {
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
    this.name = name;
    this.listeners = [];
    this.id = id || uuid();
    this.server = null;
    this.connections = new Pool();
    this.serviceConnectionCallback = void 0;
    this.serviceDisconnectCallback = void 0;
    this.newListenersCallback = void 0;
  }
  async connect({ name, host, port, as }) {
    const connection = new Connection({
      name: this.name,
      host,
      port,
      id: this.id,
      onSetListeners: this.newListenersCallback
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
    log(`[Network][${this.name}] connecting to all services`, services);
    let connections = await Promise.all(services.map(
      async (service) => await this.connect({
        name: service.name,
        host: service.host,
        port: service.port
      })
    )).catch((err) => {
      log(`[Network][${this.name}] error connecting to services:`, err);
      return [];
    });
    return connections;
  }
  createServer(name, host, port, listeners = []) {
    this.server = new Server({ name, host, port, listeners });
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
      log("inside loop conenction:", connection);
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
export {
  Network_default as default
};
//# sourceMappingURL=Network.js.map