import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { log, Pool } from "../utils/index.js";
import Connection from "./Connection.js";
class NetworkServer {
  constructor({ name, host, port, listeners }, options) {
    /* this class will handle the logic managing the server conenctions with clilent, 
     * it will keep track of the node id and it will handle connection and dicoections */
    __publicField(this, "io");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "maxTransferSize");
    __publicField(this, "clients");
    __publicField(this, "name");
    __publicField(this, "isLan");
    __publicField(this, "connectionCallback");
    __publicField(this, "disconnectCallback");
    __publicField(this, "listeners");
    __publicField(this, "httpServer");
    __publicField(this, "isReady");
    __publicField(this, "ioOptions");
    this.host = host || "localhost";
    this.isLan = this.host !== "localhost";
    this.port = port || 0;
    this.isReady = false;
    this.maxTransferSize = options?.maxTransferSize || 1e9;
    this.name = name ? name : "server";
    this.connectionCallback = null;
    this.disconnectCallback = null;
    this.clients = new Pool();
    this.listeners = listeners || [];
    this.ioOptions = {
      maxHttpBufferSize: this.maxTransferSize
    };
    if (this.isLan) {
      this.httpServer = createServer();
      this.io = new Server(this.httpServer, this.ioOptions);
      if (this.io.httpServer.address() === null)
        throw new Error("Host and port already in use or invalid");
      this.httpServer.listen(this.port, this.host, () => {
        let address = this.httpServer?.address();
        if (!address || typeof address === "string") {
          console.error("Server is not running");
          return;
        }
        this.isReady = true;
        this.port = address.port;
      });
    } else {
      this.io = new Server(this.port, this.ioOptions);
      if (this.io.httpServer.address() === null)
        throw new Error("Host and port already in use or invalid");
      this.port = this.io.httpServer.address().port;
    }
    this.io.on("connection", this.handleConnection.bind(this));
    this.io.on("reconnect", () => log("[Server] on reconnect triggered"));
    this.io.on("disconnect", this.handleDisconnection.bind(this));
    this.setListeners(this.listeners);
  }
  async handleConnection(socket) {
    log("[Server] got new connection");
    let connection = new Connection({
      socket,
      name: this.name,
      listeners: this.listeners
    });
    await connection.connected();
    let id = connection.getTargetId();
    log("[Server] connection id: ", id);
    if (id == null) throw new Error("Connection id is null");
    if (this.clients.has(id)) {
      let client = this.clients.remove(id);
      client && client.close();
    }
    this.clients.add(id, connection);
    if (this.connectionCallback)
      this.connectionCallback(connection);
  }
  handleDisconnection(socket) {
    console.log("[Server] got disconnection from node");
    let socketId = socket.id;
    console.log("[Server] socket id: ", socketId);
    let conn = this.clients.toArray().filter((client) => client.socketId === socketId)[0];
    if (conn) {
      conn.close();
      let id = conn.getTargetId();
      if (id === void 0)
        throw new Error("Connection id is undefined");
      this.clients.remove(conn.getTargetId());
      if (this.disconnectCallback)
        this.disconnectCallback(conn);
    }
  }
  setListeners(listeners) {
    listeners.forEach((listener) => {
      let callback = async (...args) => {
        let result = await listener.callback(...args);
        this.io.emit(listener.event, result);
      };
      this.io.removeAllListeners(listener.event);
      this.io.on(listener.event, callback);
    });
    this.listeners = listeners;
    this.io.emit("_set_listeners", this.listeners);
  }
  broadcast(event, data) {
    this.io.emit(event, data);
  }
  addListeners(listeners) {
    const eventMap = new Map(this.listeners.map((l) => [l.event, l]));
    listeners.forEach((l) => eventMap.set(l.event, l));
    listeners = Array.from(eventMap.values());
    this.setListeners(this.listeners);
  }
  getClient(id) {
    return this.clients.get(id);
  }
  getClients() {
    return this.clients.toArray();
  }
  onConnection(callback) {
    this.connectionCallback = callback;
  }
  onDisconnect(callback) {
    this.disconnectCallback = callback;
  }
  getListeners() {
    let client = this.clients.toArray()[0];
    if (!client) return [];
    return client.getListeners();
  }
  async close() {
    this.io.close();
  }
}
var Server_default = NetworkServer;
export {
  Server_default as default
};
//# sourceMappingURL=Server.js.map