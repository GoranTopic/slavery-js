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
var Server_exports = {};
__export(Server_exports, {
  default: () => Server_default
});
module.exports = __toCommonJS(Server_exports);
var import_socket = require("socket.io");
var import_http2 = require("http");
var import_utils = require("../utils/index.js");
var import_Connection = __toESM(require("./Connection.js"), 1);
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
    __publicField(this, "timeout");
    __publicField(this, "ioOptions");
    this.host = host || "localhost";
    this.isLan = this.host !== "localhost";
    this.port = port || 0;
    this.isReady = false;
    this.maxTransferSize = options?.maxTransferSize || 1e9;
    this.name = name ? name : "server";
    this.connectionCallback = null;
    this.disconnectCallback = null;
    this.clients = new import_utils.Pool();
    this.listeners = listeners || [];
    this.ioOptions = {
      maxHttpBufferSize: this.maxTransferSize
    };
    this.timeout = options?.timeout || 5 * 60 * 1e3;
    if (this.isLan) {
      this.httpServer = (0, import_http2.createServer)();
      this.io = new import_socket.Server(this.httpServer, this.ioOptions);
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
      this.io = new import_socket.Server(this.port, this.ioOptions);
      if (this.io.httpServer.address() === null)
        throw new Error("Host and port already in use or invalid");
      this.port = this.io.httpServer.address().port;
    }
    this.io.on("connection", this.handleConnection.bind(this));
    this.io.on("reconnect", () => (0, import_utils.log)("[Server] on reconnect triggered"));
    this.io.on("disconnect", this.handleDisconnection.bind(this));
    this.setListeners(this.listeners);
  }
  async handleConnection(socket) {
    (0, import_utils.log)("[Server] got new connection");
    let connection = new import_Connection.default({
      socket,
      name: this.name,
      options: {
        listeners: this.listeners,
        timeout: this.timeout
      }
    });
    await connection.connected();
    let id = connection.getTargetId();
    (0, import_utils.log)("[Server] connection id: ", id);
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
    let socketId = socket.id;
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
//# sourceMappingURL=Server.cjs.map