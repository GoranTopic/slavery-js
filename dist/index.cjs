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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Node: () => nodes_default,
  PeerDiscoverer: () => peerDiscovery_default,
  Service: () => service_default,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/network/Connection.ts
var import_socket = require("socket.io-client");
var Connection = class {
  /*
   * @param Node: Node
   * @param socket: Socket
   * @param host: string
   * @param port: number
   * @param id: string
   * @param name: string
   * */
  constructor({
    socket,
    host,
    port,
    id,
    name,
    listeners,
    timeout,
    onConnect,
    onDisconnect,
    onSetListeners
  }) {
    /*
     * this class is manager for the socket instance
     * it takes either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     *
     * it manages conenction, the listeners and the available emitters */
    __publicField(this, "socket");
    __publicField(this, "request_id", 0);
    // this node information
    __publicField(this, "name");
    __publicField(this, "id");
    __publicField(this, "listeners", []);
    __publicField(this, "type");
    __publicField(this, "host");
    __publicField(this, "port");
    // is connected or not
    __publicField(this, "isConnected");
    // ot target of the socket
    __publicField(this, "socketId");
    __publicField(this, "targetType");
    __publicField(this, "targetName");
    __publicField(this, "targetId");
    __publicField(this, "targetListeners", []);
    __publicField(this, "targetHost");
    __publicField(this, "targetPort");
    // callbacks
    __publicField(this, "onConnectCallback");
    __publicField(this, "onDisconnectCallback");
    __publicField(this, "onSetListenersCallback");
    __publicField(this, "send", this.query);
    this.onConnectCallback = onConnect || (() => {
    });
    this.onDisconnectCallback = onDisconnect || (() => {
    });
    this.onSetListenersCallback = onSetListeners || (() => {
    });
    if (listeners) this.listeners = listeners;
    if (socket && name) {
      this.type = "server";
      this.name = name;
      this.targetType = "client";
      this.socket = socket;
      this.targetId = socket.handshake.auth.id;
      this.isConnected = true;
    } else if (host && port && id) {
      this.type = "client";
      this.targetType = "server";
      this.id = id;
      this.socket = (0, import_socket.io)(`ws://${host}:${port}`, {
        auth: { id },
        timeout: timeout || 1e3 * 60
        // 1 minute
      });
      this.isConnected = false;
    } else
      throw new Error("Connection must have either a socket and a name or a host and port");
    this.socketId = this.socket.id;
    this.initilaizeListeners();
  }
  initilaizeListeners() {
    this.listeners.forEach((l) => {
      this.socket.removeAllListeners(l.event);
      this.socket.on(l.event, this.respond(l.event, async (parameters) => {
        return await l.callback(parameters);
      }));
    });
    this.socket.on("_listeners", this.respond("_listeners", () => this.getListeners()));
    this.socket.on("_set_listeners", this.respond("_set_listeners", (listeners) => {
      this.targetListeners = listeners.map((event) => ({ event, callback: () => {
      } }));
      this.onSetListenersCallback(this.targetListeners);
      return "ok";
    }));
    this.socket.on("_name", this.respond("_name", () => this.name));
    this.socket.on("_id", () => this.id);
    this.socket.on("connect", async () => {
      this.targetName = await this.queryTargetName();
      this.targetListeners = await this.queryTargetListeners();
      this.isConnected = true;
      this.onConnectCallback(this);
    });
    this.socket.on("reconnect", async (attempt) => {
      this.targetName = await this.queryTargetName();
      this.targetListeners = await this.queryTargetListeners();
      this.isConnected = true;
      this.onConnectCallback(this);
    });
    this.socket.on("diconnect", () => {
      this.isConnected = false;
      this.onDisconnectCallback(this);
    });
  }
  async connected() {
    return new Promise((resolve, reject) => {
      let interval;
      let timeout;
      interval = setInterval(() => {
        if (this.isConnected) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(true);
        }
      }, 100);
      timeout = setTimeout(() => {
        clearInterval(interval);
        reject(false);
      }, 1e3 * 60);
    });
  }
  getType() {
    return this.type;
  }
  on(event, callback) {
    this.socket.on(event, callback);
  }
  emit(event, data) {
    this.socket.emit(event, data);
  }
  getName() {
    return this.name;
  }
  // this is the id of the conenction?
  getId() {
    return this.id;
  }
  getTargetName() {
    return this.targetName;
  }
  // this is the id of the target client
  getTargetId() {
    return this.targetId;
  }
  async setListeners(listeners) {
    listeners.forEach((l) => {
      this.listeners.push(l);
      this.socket.removeAllListeners(l.event);
      this.socket.on(l.event, this.respond(l.event, async (parameters) => {
        return await l.callback(parameters);
      }));
    });
    if (this.type === "server") {
      await this.query("_set_listeners", listeners.map((listener) => listener.event));
    }
  }
  addListeners(listeners) {
    const eventMap = new Map(this.listeners.map((l) => [l.event, l]));
    listeners.forEach((l) => eventMap.set(l.event, l));
    this.listeners = Array.from(eventMap.values());
    this.setListeners(this.listeners);
  }
  getTargetListeners() {
    return this.targetListeners;
  }
  onSetListeners(callback) {
    this.onSetListenersCallback = callback;
  }
  onConnect(callback) {
    this.onConnectCallback = callback;
  }
  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }
  queryTargetListeners() {
    return this.query("_listeners");
  }
  queryTargetName() {
    return this.query("_name");
  }
  // this function need to be awaited
  query(event, data) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject("timeout");
      }, 1e3 * 60);
      let request_id = ++this.request_id;
      if (this.request_id >= Number.MAX_SAFE_INTEGER - 1) this.request_id = 0;
      this.socket.emit(event, { data, request_id });
      this.socket.on(event + `_${request_id}_response`, (response) => {
        clearTimeout(timeout);
        this.socket.removeAllListeners(event + `_${request_id}_response`);
        resolve(response);
      });
    });
  }
  respond(event, callback) {
    return async (parameters) => {
      let data = parameters.data;
      let request_id = parameters.request_id;
      let response = await callback(data);
      this.socket.emit(event + `_${request_id}_response`, response);
    };
  }
  getListeners() {
    if (this.type === "server")
      return this.listeners;
    else if (this.type === "client")
      return this.socket._callbacks;
    else
      throw new Error("Connection type not recognized");
  }
  close() {
    this.socket.disconnect();
  }
};
var Connection_default = Connection;

// src/utils/Queue.ts
var Queue = class {
  constructor(items = []) {
    __publicField(this, "items", []);
    // clear the queue
    __publicField(this, "clear", () => this.items = []);
    // synonyms
    __publicField(this, "pop", this.dequeue);
    __publicField(this, "push", this.enqueue);
    __publicField(this, "shift", this.dequeue);
    __publicField(this, "unshift", this.enqueue);
    __publicField(this, "front", this.peek);
    __publicField(this, "end", this.next);
    if (items.length > 0)
      this.items = items;
    else
      this.items = [];
  }
  enqueue(item) {
    this.items.push(item);
    return true;
  }
  dequeue() {
    if (this.items.length > 0) {
      const item = this.items.shift();
      if (item === void 0) return false;
      return item;
    }
    return false;
  }
  next() {
    if (this.items.length > 0) {
      const item = this.items.shift();
      if (item) {
        this.items.push(item);
        return item;
      }
    }
    return false;
  }
  // remove value while maintaining order
  removeAt(index) {
    if (index > -1 && index < this.items.length) {
      return this.items.splice(index, 1)[0];
    } else {
      return false;
    }
  }
  indexOf(item) {
    return this.items.indexOf(item);
  }
  remove(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      return this.items.splice(index, 1)[0];
    } else {
      return false;
    }
  }
  peek() {
    return this.items[0];
  }
  printQueue() {
    return this.items;
  }
  // return array of items in the order they were added
  toArray() {
    return this.items;
  }
  // return object of items in the order they were added
  toObject() {
    let obj = {};
    this.items.forEach((item, index) => {
      obj[index] = item;
    });
    return obj;
  }
  // get the size of the queue
  size() {
    return this.items.length;
  }
  // lenght of the queue
  length() {
    return this.items.length;
  }
  // check if queue is empty
  isEmpty() {
    return this.items.length === 0;
  }
};
var Queue_default = Queue;

// src/utils/Pool.ts
var Pool = class {
  constructor() {
    /* *
     * this class handle the socket connectd
     * queue of sockets and manages connection with the workers
     * */
    __publicField(this, "enabled");
    __publicField(this, "disabled");
    __publicField(this, "items");
    // synonims
    __publicField(this, "next", this.rotate);
    __publicField(this, "pop", this.nextAndDisable);
    __publicField(this, "shift", this.nextAndEnable);
    __publicField(this, "unshift", this.add);
    __publicField(this, "push", this.add);
    __publicField(this, "count", this.size);
    __publicField(this, "removeAt", this.remove);
    __publicField(this, "removeItem", this.remove);
    this.enabled = new Queue_default();
    this.disabled = [];
    this.items = {};
  }
  has(id) {
    return this.items[id] ? true : false;
  }
  add(id, item) {
    if (this.has(id)) this.remove(id);
    this.enabled.enqueue(id);
    this.items[id] = item;
    return false;
  }
  disable(id) {
    if (!this.has(id)) return false;
    if (this.disabled.indexOf(id) !== -1) return true;
    if (this.enabled.indexOf(id) !== -1) {
      this.enabled.remove(id);
      this.disabled.push(id);
      return true;
    }
    return false;
  }
  disableUntil(id, timeOrCondition) {
    if (!this.has(id)) return;
    let time = null;
    let condition = null;
    if (typeof timeOrCondition === "number")
      time = timeOrCondition;
    else if (typeof timeOrCondition === "function")
      condition = timeOrCondition;
    else throw new Error("timeOrCondition must be a number or a function");
    if (this.enabled.indexOf(id) !== -1) this.disable(id);
    if (this.disabled.indexOf(id) === -1) throw new Error("id is not in the disabled list");
    if (time) setTimeout(() => this.enable(id), time);
    if (condition) {
      let interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          this.enable(id);
        }
      }, 100);
    }
  }
  enable(id) {
    if (!this.has(id)) return false;
    if (this.enabled.indexOf(id) !== -1) return true;
    if (this.disabled.indexOf(id) !== -1) {
      this.disabled = this.disabled.filter((e) => e !== id);
      this.enabled.enqueue(id);
      return true;
    }
    return false;
  }
  nextAndEnable() {
    if (this.disabled.length === 0) return false;
    let id = this.disabled[0];
    this.enable(id);
    return id;
  }
  rotate() {
    if (this.size() === 0) return null;
    const id = this.enabled.dequeue();
    if (!id) return null;
    this.enabled.enqueue(id);
    return this.items[id];
  }
  hasEnabled() {
    return this.enabled.size() > 0;
  }
  nextAndDisable() {
    if (this.size() === 0) return null;
    const id = this.enabled.dequeue();
    if (!id) return null;
    this.disabled.push(id);
    return this.items[id];
  }
  // remove value while maintaining order
  remove(id) {
    let result2 = this._lookUp(id);
    if (result2) {
      let index = result2.index;
      let list = result2.list;
      if (list === "enabled")
        this.enabled.removeAt(index);
      else
        this.disabled.splice(index, 1);
      let item = this.items[id];
      delete this.items[id];
      return item;
    }
    return null;
  }
  removeOne() {
    if (this.enabled.size() > 0) {
      let id = this.enabled.dequeue();
      if (id === void 0 || id === false) return null;
      let item = this.items[id];
      delete this.items[id];
      return item;
    }
    return null;
  }
  get(id) {
    if (!this.has(id)) return null;
    return this.items[id];
  }
  // get the size of the pool
  size() {
    return Object.keys(this.items).length;
  }
  // lenght of the pool
  length() {
    return this.size();
  }
  // count the enabled elements
  getEnabledCount() {
    return this.enabled.size();
  }
  // count the disabled elements
  getDisabledCount() {
    return this.disabled.length;
  }
  // check if queue is empty
  isEmpty() {
    return this.size() === 0;
  }
  _lookUp(id) {
    let index = this.enabled.indexOf(id);
    if (!(index === -1))
      return { index, list: "enabled" };
    index = this.disabled.indexOf(id);
    if (!(index === -1))
      return { index, list: "disabled" };
    return false;
  }
  toArray() {
    return Object.values(this.items);
  }
  print() {
    console.log(this.toArray());
  }
  getEnabled() {
    return this.enabled.toArray();
  }
  getEnabledObjects() {
    return this.enabled.toArray().map((id) => this.items[id]);
  }
  getDisabled() {
    return this.disabled;
  }
  getDisabledObjects() {
    return this.disabled.map((id) => this.items[id]);
  }
  getConnections() {
    return Object.keys(this.items);
  }
  healthCheck() {
    let total = this.size();
    let enabled = this.getEnabled().length;
    let disabled = this.getDisabled().length;
    if (total === enabled + disabled)
      return true;
    else return false;
  }
};
var Pool_default = Pool;

// src/utils/log.ts
var log = (...args) => {
  if (process.env.debug === "true") {
    let pretext = process.env.type ? process.env.type : "Primary";
    console.log(`[${pretext}]`, ...args);
  } else return null;
};
var log_default = log;

// src/utils/uuids.ts
var import_uuid = require("uuid");
var generateUUID = () => {
  return (0, import_uuid.v4)();
};
var uuids_default = generateUUID;

// src/utils/await_interval.ts
async function interval_await(condition, timeout = 1e4, interval = 100) {
  return await new Promise(async (resolve, reject) => {
    let timeout_obj;
    let interval_obj;
    if (timeout > 0) {
      timeout_obj = setTimeout(() => {
        clearInterval(interval_obj);
        reject("timeout");
      }, timeout);
    }
    interval_obj = setInterval(async () => {
      let result2 = await condition();
      if (result2 === true) {
        clearInterval(interval_obj);
        clearTimeout(timeout_obj);
        resolve(result2);
      }
    }, interval);
  }).catch((error) => {
    throw error;
  });
}
var await_interval_default = interval_await;

// src/utils/toListeners.ts
function toListeners(slaveMethods) {
  return Object.keys(slaveMethods).map((key) => ({
    event: key,
    parameters: slaveMethods[key].length > 0 ? new Array(slaveMethods[key].length).fill(void 0) : void 0,
    callback: slaveMethods[key]
  }));
}
var toListeners_default = toListeners;

// src/utils/ipAndPort.ts
var ip = __toESM(require("ip"), 1);
var import_get_port = __toESM(require("get-port"), 1);

// src/utils/isServerActive.ts
async function isServerActive({ name, host, port, timeout }) {
  return new Promise((resolve) => {
    const connection = new Connection_default({
      host,
      port,
      id: "connection_test" + Math.random(),
      timeout: 1e4,
      // Increased timeout (e.g. 10 seconds)
      onConnect: (connection2) => {
        resolve(true);
        connection2.close();
      }
    });
    connection.on("connect_error", () => {
      log_default(`Connection error to ${name} at ${host}:${port}`);
    });
    connection.on("connect_timeout", () => {
      log_default(`Connection timeout to ${name} at ${host}:${port}`);
      resolve(false);
      connection.close();
    });
    connection.connected();
    setTimeout(() => {
      resolve(false);
      connection.close();
    }, 12e3);
  });
}
var isServerActive_default = isServerActive;

// src/utils/execAsyncCode.ts
var AsyncFunction = Object.getPrototypeOf(async function() {
}).constructor;
async function runAsyncCode(codeString, context = {}) {
  let userFunc;
  if (typeof codeString !== "string")
    throw new TypeError("The first argument must be a string of code");
  if (isCallbackString(codeString)) {
    try {
      userFunc = eval(`(${codeString})`);
      let result = await userFunc(context);
      return result;
    } catch (error) {
      throw error;
    }
  }
  try {
    userFunc = new AsyncFunction(...Object.keys(context), codeString);
    const result2 = await userFunc(...Object.values(context));
    return result2;
  } catch (error) {
    throw error;
  }
}
function isCallbackString(code) {
  try {
    const fn = eval(`(${code})`);
    return typeof fn === "function";
  } catch (e) {
    return false;
  }
}
var execAsyncCode_default = runAsyncCode;

// src/network/Server.ts
var import_socket2 = require("socket.io");
var import_http = require("http");
var NetworkServer = class {
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
    this.clients = new Pool_default();
    this.listeners = listeners || [];
    this.ioOptions = {
      maxHttpBufferSize: this.maxTransferSize
    };
    if (this.isLan) {
      this.httpServer = (0, import_http.createServer)();
      this.io = new import_socket2.Server(this.httpServer, this.ioOptions);
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
      this.io = new import_socket2.Server(this.port, this.ioOptions);
      this.port = this.io.httpServer.address().port;
    }
    this.io.on("connection", this.handleConnection.bind(this));
    this.io.on("reconnect", () => log_default("[Server] on reconnect triggered"));
    this.io.on("disconnect", this.handleDisconnection.bind(this));
    this.setListeners(this.listeners);
  }
  async handleConnection(socket) {
    log_default("[Server] got new connection");
    let connection = new Connection_default({
      socket,
      name: this.name,
      listeners: this.listeners
    });
    await connection.connected();
    let id = connection.getTargetId();
    log_default("[Server] connection id: ", id);
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
        let result2 = await listener.callback(...args);
        this.io.emit(listener.event, result2);
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
};
var Server_default = NetworkServer;

// src/network/Network.ts
var Network = class {
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
    this.id = id || uuids_default();
    this.server = null;
    this.connections = new Pool_default();
    this.serviceConnectionCallback = void 0;
    this.serviceDisconnectCallback = void 0;
    this.newListenersCallback = void 0;
  }
  async connect({ name, host, port, as }) {
    const connection = new Connection_default({
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
    log_default(`[Network][${this.name}] connecting to all services`, services);
    let connections = await Promise.all(services.map(
      async (service) => await this.connect({
        name: service.name,
        host: service.host,
        port: service.port
      })
    )).catch((err) => {
      log_default(`[Network][${this.name}] error connecting to services:`, err);
      return [];
    });
    return connections;
  }
  createServer(name, host, port, listeners = []) {
    this.server = new Server_default({ name, host, port, listeners });
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
      log_default("inside loop conenction:", connection);
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
};
var Network_default = Network;

// src/network/index.ts
var network_default = Network_default;

// src/cluster/ProcessCluster.ts
var import_child_process = require("child_process");
var import_node_process = __toESM(require("process"), 1);
var Cluster = class {
  constructor(options) {
    __publicField(this, "numberOfProcesses");
    __publicField(this, "process_timeout");
    __publicField(this, "crash_on_error");
    __publicField(this, "thisProcess");
    __publicField(this, "type");
    __publicField(this, "processes");
    __publicField(this, "allowedToSpawn");
    __publicField(this, "spawnOnlyFromPrimary");
    __publicField(this, "debugging");
    this.numberOfProcesses = options.numberOfProcesses || null;
    this.process_timeout = options.process_timeout || null;
    this.crash_on_error = options.crash_on_error || false;
    this.debugging = options.debugging || false;
    this.type = import_node_process.default.env.type || "primary";
    this.allowedToSpawn = import_node_process.default.env.allowedToSpawn === "true" || false;
    this.spawnOnlyFromPrimary = false;
    this.thisProcess = import_node_process.default;
    this.processes = [];
  }
  spawn(process_type, {
    numberOfSpawns,
    allowedToSpawn,
    spawnOnlyFromPrimary,
    metadata
  } = {}) {
    this.log("Spawning new process " + process_type);
    this.log(`allowedToSpawn: ${allowedToSpawn}`);
    this.log("this.amIThePrimaryProcess(): " + this.amIThePrimaryProcess());
    if (numberOfSpawns === void 0) numberOfSpawns = 1;
    this.spawnOnlyFromPrimary = spawnOnlyFromPrimary || false;
    if (this.amIThePrimaryProcess() && allowedToSpawn) allowedToSpawn = true;
    else allowedToSpawn = false;
    this.log("final passing on allowedToSpawn " + allowedToSpawn);
    if (this.isProcessAllowedToSpawn() === false) return;
    let curProcess;
    for (let i = 0; i < numberOfSpawns; i++) {
      curProcess = (0, import_child_process.fork)(
        import_node_process.default.argv[1],
        [],
        {
          env: {
            is_child: "true",
            type: process_type,
            allowedToSpawn: `${allowedToSpawn}`,
            metadata: JSON.stringify(metadata)
          }
        }
      );
      this.processes.push(curProcess);
    }
  }
  isProcessAllowedToSpawn() {
    if (this.spawnOnlyFromPrimary && this.amIChildProcess())
      return false;
    if (this.amIThePrimaryProcess()) {
      this.log("Primary process is allowed to spawn new processes");
      return true;
    } else this.log("Process is not the primary process");
    if (this.allowedToSpawn) {
      this.log("Process is allowed to spawn new processes");
      return true;
    } else this.log("Process is not allowed to spawn new processes");
    return false;
  }
  get_this_process() {
    return this.thisProcess;
  }
  get_processes() {
    return this.processes;
  }
  is(process_type) {
    this.log(`checking if is process ${process_type}`);
    if (process_type === "primary") return this.amIThePrimaryProcess();
    return import_node_process.default.env.type === process_type;
  }
  amIThePrimaryProcess() {
    if (this.thisProcess.env.is_child === void 0)
      return true;
    if (this.thisProcess.env.is_child === null)
      return true;
    if (this.thisProcess.env.is_child === "false")
      return true;
    return false;
  }
  isPrimary() {
    return this.amIThePrimaryProcess();
  }
  amIChildProcess() {
    return import_node_process.default.env.is_child === "true";
  }
  log(message) {
    this.debugging && console.log(`[${import_node_process.default.pid}][${this.type}] ${message}`);
  }
  getMetadata() {
    return import_node_process.default.env.metadata;
  }
};
var ProcessCluster_default = Cluster;

// src/cluster/index.ts
var cluster_default = ProcessCluster_default;

// src/app/peerDiscovery/PeerDiscoveryServer.ts
var PeerDicoveryServer = class {
  constructor(params) {
    /* This will be the based class for the service which salvery will call to create proceses */
    __publicField(this, "name");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "cluster", null);
    __publicField(this, "network", null);
    __publicField(this, "services", {});
    this.name = "peer_discovery";
    this.host = params.host;
    this.port = params.port;
  }
  async start() {
    this.cluster = new cluster_default({ name: this.name });
    this.cluster.spawn(this.name, {
      spawnOnlyFromPrimary: true
      // make sure that only one the primary process can spawn this service
    });
    if (this.cluster.is("peer_discovery")) {
      this.network = new network_default({ name: this.name + "_network" });
      let listeners = this.getListeners();
      this.network.createServer(this.name, this.host, this.port, listeners);
    }
    return;
  }
  getListeners() {
    let listeners = [{
      // get number of nodes
      event: "register_service",
      params: ["name", "host", "port"],
      callback: this.registerService.bind(this)
    }, {
      event: "get_services",
      callback: this.getServices.bind(this)
    }, {
      event: "remove_service",
      params: ["name"],
      callback: this.removeService.bind(this)
    }, {
      // select individual nodes, or groups of nodes
      event: "exit",
      callback: this.exit.bind(this)
    }];
    return listeners;
  }
  registerService({ name, host, port }) {
    if (this.network === null) throw new Error("Network is not initialized");
    if (this.services[name]) throw new Error(`Service ${name} is already registered`);
    this.services[name] = { name, host, port };
    if (this.network === null) throw new Error("Network is not initialized");
    if (this.network.server === null) throw new Error("Server is not initialized");
    this.network.server.broadcast("new_service", { name, host, port });
    return;
  }
  getServices() {
    return Object.values(this.services);
  }
  removeService(name) {
    if (!this.services[name]) return false;
    if (this.network === null) throw new Error("Network is not initialized");
    if (this.network.server === null) throw new Error("Server is not initialized");
    delete this.services[name];
    this.network.server.broadcast("remove_service", { name });
    return true;
  }
  exit() {
    setTimeout(() => {
      if (this.network) this.network.close();
      process.exit(0);
    }, 1e3);
    return true;
  }
};
var PeerDiscoveryServer_default = PeerDicoveryServer;

// src/app/peerDiscovery/PeerDiscoveryClient.ts
var PeerDiscoveryClient = class {
  // 2 seconds
  // get the network from the connection
  constructor({ host, port, name }) {
    /* this class will be used to connect to a the peer discovery server */
    __publicField(this, "name", "peer_discovery");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "network", new network_default({ name: "peer_discovery" }));
    // the time we give every service to register, before we get the services
    __publicField(this, "windowTime", 2e3);
    this.name = name || "peer_discovery";
    this.host = host;
    this.port = port;
  }
  async connect() {
    if (this.network === void 0) throw new Error("Network not set");
    await this.network.connect({
      name: this.name,
      host: this.host,
      port: this.port
    });
  }
  async register({ host, port, name }) {
    if (this.network === void 0) throw new Error("Network not set");
    let connection = this.network.getService(this.name);
    if (connection === null) throw new Error(`Service ${this.name} not found`);
    return await connection.send("register_service", { host, port, name });
  }
  async getServices() {
    await new Promise((resolve) => setTimeout(resolve, this.windowTime));
    if (this.network === void 0) throw new Error("Network not set");
    let connection = this.network.getService(this.name);
    if (connection === null) throw new Error(`Service ${this.name} not found`);
    let services = await connection.send("get_services");
    return services;
  }
  async exit() {
    if (this.network === void 0) throw new Error("Network not set");
    let connection = this.network.getService(this.name);
    if (connection === null) throw new Error(`Service ${this.name} not found`);
    return await connection.send("exit");
  }
};
var PeerDiscoveryClient_default = PeerDiscoveryClient;

// src/app/peerDiscovery/index.ts
var peerDiscovery_default = PeerDiscoveryServer_default;

// src/app/makeProxyObject.ts
var proxy;
var makeProxyObject = (callback) => {
  const proxyObjecHandler = makeProxyObjecHandler(callback);
  proxy = new Proxy({}, proxyObjecHandler);
  return proxy;
};
var makeProxyObjecHandler = (callback) => ({
  get(target, prop) {
    return (args, args2, args3) => {
      let method = prop;
      let param1 = args;
      let param2 = args2;
      let param3 = args3;
      if (typeof args !== "function" && typeof args !== "object")
        throw new Error("first parameter must be a function or an object");
      if (args2 !== void 0 && typeof args2 !== "object")
        throw new Error("second parameter must be an object");
      if (args3 !== void 0 && typeof args3 !== "object")
        throw new Error("third parameter must be an object");
      callback(method, param1, param2, param3);
      return proxy;
    };
  }
});
var makeProxyObject_default = makeProxyObject;

// src/nodes/Node.ts
var import_serialize_error = require("serialize-error");
var Node = class {
  constructor() {
    __publicField(this, "mode");
    __publicField(this, "id");
    __publicField(this, "status", "idle");
    __publicField(this, "listeners", []);
    __publicField(this, "lastUpdateAt", Date.now());
    __publicField(this, "network");
    __publicField(this, "servicesConnected", false);
    // fields when the class is client handler on a service
    __publicField(this, "statusChangeCallback", null);
    // stash changes functions
    __publicField(this, "stashSetFunction", null);
    __publicField(this, "stashGetFunction", null);
    // fields when the class is a service handler on a node
    __publicField(this, "services", []);
    __publicField(this, "doneMethods", {});
    __publicField(this, "methods", {});
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
      await await_interval_default(() => this.isIdle(), 1e3).catch(() => {
        throw new Error("The node is not idle");
      });
      return true;
    });
    __publicField(this, "run", async (method, parameter) => {
      if (this.mode === "client") return await this.run_client({ method, parameter });
      else if (this.mode === "server") return await this.run_server({ method, parameter });
      else throw new Error("The mode has not been set");
    });
    __publicField(this, "exec", async (method, code2) => {
      if (this.mode === "client") return await this.exec_client(code2);
      else if (this.mode === "server") return await this.exec_server(code2);
      else throw new Error("The mode has not been set");
    });
    __publicField(this, "setServices", async (services) => {
      if (this.mode === "client") return await this.setServices_client(services);
      else if (this.mode === "server") return await this.setServices_server(services);
      else throw new Error("The mode has not been set");
    });
    __publicField(this, "exit", async () => {
      if (this.mode === "client") return await this.exit_client();
      else if (this.mode === "server") return await this.exit_server();
      else throw new Error("The mode has not been set");
    });
    __publicField(this, "ping", async () => {
      if (this.mode === "client") return await this.ping_client();
      else if (this.mode === "server") return await this.ping_server();
      else throw new Error("The mode has not been set");
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
  }
  /* this functions will set the Node.ts as a client handler for the server */
  setNodeConnection(connection, network) {
    if (this.mode !== void 0 && this.mode !== null)
      throw new Error("The node mode has already been set");
    this.mode = "server";
    this.id = connection.getTargetId();
    this.network = network;
    if (this.stashSetFunction === null || this.stashGetFunction === null)
      throw new Error("The stash functions have not been set");
    this.listeners = [
      //  this callbacks will run when we recive this event from the client node
      { event: "_set_status", parameters: ["status"], callback: this.handleStatusChange.bind(this) },
      { event: "_ping", parameters: [], callback: () => "_pong" },
      { event: "_set_stash", parameters: ["key", "value"], callback: this.stashSetFunction },
      { event: "_get_stash", parameters: ["key"], callback: this.stashGetFunction }
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
  async run_server({ method, parameter }) {
    this.handleStatusChange("working");
    let res = await this.send("_run", { method, parameter });
    this.handleStatusChange("idle");
    if (res.isError === true)
      res.error = (0, import_serialize_error.deserializeError)(res.error);
    return res;
  }
  async exec_server(code2) {
    this.handleStatusChange("working");
    let res = await this.send("_exec", code2);
    this.handleStatusChange("idle");
    if (res.isError === true)
      res.error = (0, import_serialize_error.deserializeError)(res.error);
    return res;
  }
  async setServices_server(services) {
    let res = await this.send("_set_services", services);
    return res;
  }
  async ping_server() {
    let res = await this.send("_ping");
    if (res === "pong") this.updateLastHeardOf();
    return true;
  }
  async exit_server() {
    let res = await this.send("_exit", null).catch((error) => {
      if (error === "timeout") return true;
      else throw error;
    });
    return res;
  }
  async registerServices(service) {
    let services = service.map((service2) => new Promise(async (resolve) => {
      let result2 = await this.send("_connect_service", service2);
      resolve(result2);
    }));
    return await Promise.all(services);
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
  async connectToMaster(host, port) {
    this.id = this.id || Math.random().toString(36).substring(4);
    this.network = new network_default({ name: "node", id: this.id });
    this.network.connect({ host, port, as: "master" });
    this.mode = "client";
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
  }
  async run_client({ method, parameter }) {
    await await_interval_default(() => this.servicesConnected, 1e4).catch(() => {
      throw new Error(`[Node][${this.id}] Could not connect to the services`);
    });
    try {
      this.updateStatus("working");
      let services = this.services.map(
        (s) => new ServiceClient_default(s.name, this.network)
      ).reduce((acc, s) => {
        acc[s.name] = s;
        return acc;
      }, {});
      const result2 = await this.methods[method](parameter, { ...services, slave: this, self: this });
      this.doneMethods[method] = true;
      return { result: result2, isError: false };
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
    await await_interval_default(() => this.servicesConnected, 1e4).catch(() => {
      throw new Error(`[Service] Could not connect to the services`);
    });
    let services = this.services.map(
      (s) => new ServiceClient_default(s.name, this.network)
    ).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
    let parameter = { ...services, master: this, self: this };
    try {
      let result2 = await execAsyncCode_default(code_string, parameter);
      return { result: result2, isError: false };
    } catch (e) {
      return { isError: true, error: (0, import_serialize_error.serializeError)(e) };
    }
  }
  async _startup() {
    if (this.methods["_startup"] !== void 0)
      await this.run_client({ method: "_startup", parameter: null });
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
      if (!res)
        console.error("Could not connect to the service, ", service.name);
      else
        log_default(`[Node][${this.id}] Connected to the service, ${service.name}`);
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
};
var Node_default = Node;

// src/nodes/NodeManager.ts
var NodeManager = class {
  constructor(options) {
    __publicField(this, "name");
    __publicField(this, "network");
    //private heartBeat: number = 1000;
    __publicField(this, "nodes", new Pool_default());
    __publicField(this, "options");
    __publicField(this, "cluster", new cluster_default({}));
    __publicField(this, "stash");
    __publicField(this, "setIdle", (NodeId) => this.nodes.enable(NodeId));
    __publicField(this, "setBusy", (NodeId) => this.nodes.disable(NodeId));
    /* synonims */
    __publicField(this, "addNode", this.spawnNodes);
    __publicField(this, "removeNode", this.killNodes);
    __publicField(this, "getNumberOfNodes", this.getNodeCount);
    this.name = options.name;
    this.options = options;
    this.network = new network_default({ name: this.name + "_node_manager" });
    this.network.createServer(
      this.name + "_node_manager",
      this.options.host,
      this.options.port
    );
    this.network.onNodeConnection(this.handleNewNode.bind(this));
    this.network.onNodeDisconnect(this.handleNodeDisconnect.bind(this));
    this.stash = options.stash || null;
  }
  handleNewNode(connection) {
    log_default("[Node manager] Got a new connectection from a node");
    let node = new Node_default();
    node.setStashFunctions({
      get: async (key) => await this.stash?.get(key),
      set: async (key, value) => await this.stash?.set(key, value)
    });
    node.setNodeConnection(connection, this.network);
    node.setStatusChangeCallback(this.handleStatusChange.bind(this));
    let id = node.getId();
    if (id === void 0) throw new Error("node id is undefined");
    this.nodes.add(id, node);
    this.setIdle(id);
  }
  handleNodeDisconnect(connection) {
    let id = connection.getId();
    if (id === void 0) throw new Error("node id is undefined");
    this.nodes.remove(id);
  }
  handleStatusChange(status, node) {
    if (!status) throw new Error("status is undefined");
    let id = node.getId();
    if (id === void 0) throw new Error("node id is undefined");
    if (node.isIdle() || node.isError())
      this.setIdle(id);
    else if (node.isBusy())
      this.setBusy(id);
    else
      throw new Error("invalid node status");
  }
  async getIdle(node_id = "") {
    if (node_id !== "") {
      let node2 = this.getNode(node_id);
      await await_interval_default(() => node2.isIdle(), 60 * 60 * 60 * 1e3).catch(() => {
        throw new Error(`timeout of one hour, node ${node_id} is not idle`);
      });
      return node2;
    }
    if (this.nodes.isEmpty())
      log_default("[node manager] (WARNING) no nodes found");
    await await_interval_default(() => this.nodes.hasEnabled(), 0).catch(() => {
      throw new Error("timeout of 10 seconds, no idle node found");
    });
    let node = this.nodes.pop();
    if (node === null) throw new Error("node is null");
    return node;
  }
  getBusy() {
    return this.nodes.getDisabled().pop();
  }
  getIdleNodes() {
    return this.nodes.getEnabledObjects();
  }
  getBusyNodes() {
    return this.nodes.getDisabledObjects();
  }
  async forEach(callback) {
    let nodes = this.nodes.toArray();
    let promises = nodes.map(async (node) => {
      if (node.isBusy()) await node.toFinish();
      return callback(node);
    });
    return Promise.all(promises);
  }
  async registerServices(services) {
    return this.broadcast(
      async (node) => await node.registerServices(services)
    );
  }
  async spawnNodes(name = "", count = 1, metadata = {}) {
    if (name === "") name = "node_" + this.name;
    log_default("[nodeManager][spawnNodes] spawning nodes", name, count);
    this.cluster.spawn(name, {
      numberOfSpawns: count,
      metadata
    });
  }
  async killNode(nodeId = "") {
    if (this.nodes.isEmpty())
      return false;
    let node = nodeId === "" ? this.nodes.removeOne() : this.nodes.remove(nodeId);
    if (node === null || node === void 0)
      throw new Error("Node sentenced to death could not be found");
    await node.exit();
  }
  async killNodes(nodesId = []) {
    for (let nodeId of nodesId)
      await this.killNode(nodeId);
  }
  getIdleCount() {
    return this.nodes.getEnabledCount();
  }
  getBusyCount() {
    return this.nodes.getDisabledCount();
  }
  getNodes() {
    return this.nodes.toArray();
  }
  nextNode() {
    return this.nodes.next();
  }
  getNodeCount() {
    return this.nodes.size();
  }
  getNode(nodeId) {
    let node = this.nodes.get(nodeId);
    if (node === null) throw new Error(`[node manager] (ERROR) selected node ${nodeId} not found`);
    return node;
  }
  getListeners() {
    if (this.network === void 0) throw new Error("network is undefined");
    return this.network.getRegisteredListeners();
  }
  async numberOfNodesConnected(count) {
    let timeout = 1e5;
    await await_interval_default(() => this.nodes.size() >= count, timeout).catch(() => {
      throw new Error(`timeout of ${timeout} seconds, not enough nodes connected`);
    });
    return true;
  }
  async exit() {
    return this.broadcast(
      async (node) => await node.exit()
    );
  }
  async broadcast(callback) {
    let nodes = this.nodes.toArray();
    let promises = nodes.map(
      async (node) => await callback(node)
    );
    return Promise.all(promises);
  }
};
var NodeManager_default = NodeManager;

// src/nodes/index.ts
var nodes_default = Node_default;

// src/service/RequestQueue.ts
var RequestQueue = class {
  // Limit storage to last 500 requests
  constructor({ process_request, get_slave }) {
    /* This class will keep track of all the requests that are made to the service,
     * how long each request takes to be processed,
     * how many requests are in the queue,
     * when the requests are being processed, and
     * request individually.
     */
    __publicField(this, "queue", new Queue_default());
    __publicField(this, "process_request");
    __publicField(this, "get_slave");
    __publicField(this, "isRunning", false);
    __publicField(this, "interval");
    __publicField(this, "heartbeat", 100);
    // Check every 100ms if the request is completed
    __publicField(this, "turnover_times", []);
    // Stores time taken for the last 500 requests
    __publicField(this, "MAX_TURNOVER_ENTRIES", 500);
    this.process_request = process_request;
    this.get_slave = get_slave;
    if (!this.process_request) throw new Error("Process request cannot be null");
    if (!this.get_slave) throw new Error("Get slave cannot be null");
    this.interval = setInterval(async () => {
      if (this.isRunning) return;
      if (this.queue.size() === 0) {
        this.isRunning = false;
        return;
      }
      this.isRunning = true;
      let request = this.queue.pop();
      if (request === false) throw new Error("Request is null... is the request queue empty?");
      const slave = await this.get_slave(request.selector);
      let startTime = Date.now();
      let endTime;
      this.isRunning = false;
      this.process_request(slave, request).then(
        (result2) => {
          if (!request) throw new Error("Request is false... is the request queue empty?");
          endTime = Date.now();
          request.completed = true;
          request.result = result2;
          const timeTaken = endTime - startTime;
          this.turnover_times.push(timeTaken);
          if (this.turnover_times.length > this.MAX_TURNOVER_ENTRIES)
            this.turnover_times.shift();
        }
      ).catch((err) => {
        console.error("[RequestQueue] Request failed to complete");
        console.error(err);
        return err;
      });
    }, 100);
  }
  addRequest(request) {
    return new Promise(async (resolve, reject) => {
      this.queue.push(request);
      await await_interval_default(() => {
        log_default(request);
        return request.completed === true;
      }, 60 * 60 * 1e3, this.heartbeat).catch((err) => {
        console.error("[RequestQueue] Request failed to complete");
        console.error(err);
        reject(err);
      });
      resolve(request.result);
    });
  }
  queueSize() {
    return this.queue.size();
  }
  getTurnoverRatio() {
    if (this.turnover_times.length === 0) return 0;
    const sum = this.turnover_times.reduce((acc, time) => acc + time, 0);
    return sum / this.turnover_times.length;
  }
  exit() {
    this.queue.clear();
    clearInterval(this.interval);
  }
};
var RequestQueue_default = RequestQueue;

// src/service/ProcessBalancer.ts
var import_os = __toESM(require("os"), 1);
var ProcessBalancer = class {
  constructor(config) {
    __publicField(this, "prevQueueSize", 0);
    __publicField(this, "interval");
    __publicField(this, "queueScaleUpThreshold");
    __publicField(this, "queueScaleDownThreshold");
    __publicField(this, "maxIdleRateThreshold");
    __publicField(this, "minIdleRateThreshold");
    __publicField(this, "cpuThreshold");
    __publicField(this, "memThreshold");
    __publicField(this, "checkInterval");
    __publicField(this, "checkQueueSize");
    __publicField(this, "checkSlaves");
    __publicField(this, "addSlave");
    __publicField(this, "removeSlave");
    this.queueScaleUpThreshold = config.queueScaleUpThreshold || 3;
    this.queueScaleDownThreshold = config.queueScaleDownThreshold || 0;
    this.cpuThreshold = config.cpuThreshold || 90;
    this.memThreshold = config.memThreshold || 90;
    this.maxIdleRateThreshold = config.maxIdleRateThreshold || 0.8;
    this.minIdleRateThreshold = config.minIdleRateThreshold || 0.1;
    this.checkInterval = config.checkInterval || 500;
    this.checkQueueSize = config.checkQueueSize;
    this.checkSlaves = config.checkSlaves;
    this.addSlave = config.addSlave;
    this.removeSlave = config.removeSlave;
    this.checkRequiredFunctions();
    this.interval = this.startMonitoring();
  }
  getCpuUsage() {
    let cpus = import_os.default.cpus();
    let totalLoad = cpus.reduce((acc, cpu) => {
      let total = Object.values(cpu.times).reduce((t, v) => t + v, 0);
      return acc + cpu.times.user / total * 100;
    }, 0);
    return totalLoad / cpus.length;
  }
  getMemoryUsage() {
    return (import_os.default.totalmem() - import_os.default.freemem()) / import_os.default.totalmem() * 100;
  }
  monitorSystem() {
    if (this.checkQueueSize === void 0) throw Error("checkQueueSize is undefined");
    if (this.checkSlaves === void 0) throw Error("checkSlaves is undefined");
    this.checkRequiredFunctions();
    const queueSize = this.checkQueueSize();
    const { idleCount, workingCount } = this.checkSlaves();
    if (idleCount === void 0 || workingCount === void 0)
      throw new Error("checkSlaves function returned idleCount or workingCount with value of undefined");
    const idleRate = idleCount / workingCount + idleCount;
    const queueGrowth = queueSize - this.prevQueueSize;
    this.prevQueueSize = queueSize;
    const avgCpu = this.getCpuUsage();
    const avgMem = this.getMemoryUsage();
    if (
      // if the queue size is passed a threshold: 3
      queueSize > this.queueScaleUpThreshold && // and it is growing
      queueGrowth > 0 && // and the average CPU and MEM usage is below 90%
      avgCpu < this.cpuThreshold && avgMem < this.memThreshold && // and the ratio of idle slaves to working slaves is greater than than threshold
      idleRate < this.maxIdleRateThreshold
    ) {
      log_default("Scaling up, adding a node");
      this.addSlave();
    }
    if (
      // if the queue size is less than or equal to the threshold
      queueSize <= this.queueScaleDownThreshold && // if there is at least one
      idleCount > 1 && // if the queue size is degreesing or not growing
      queueGrowth <= 0 && // if the idle rate is low
      idleRate > this.minIdleRateThreshold
    ) {
      log_default("Scaling down, removing a node");
      this.removeSlave();
    }
  }
  startMonitoring() {
    return setInterval(() => {
      this.monitorSystem();
    }, this.checkInterval);
  }
  checkRequiredFunctions() {
    if (this.checkQueueSize === void 0)
      throw new Error("Missing required function checkQueueSize in config");
    if (this.checkSlaves === void 0)
      throw new Error("Missing required function checkSlaves in config");
    if (this.addSlave === void 0)
      throw new Error("Missing required function addSlave in config");
    if (this.removeSlave === void 0)
      throw new Error("Missing required function removeSlave in config");
  }
  exit() {
    clearInterval(this.interval);
  }
};
var ProcessBalancer_default = ProcessBalancer;

// src/service/ServiceClient.ts
var import_serialize_error2 = require("serialize-error");
var ServiceClient = class _ServiceClient {
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
    return new _ServiceClient(this.name, this.network, this.options, selection);
  }
  async exec(code2) {
    if (this.selection.length === 0) {
      return await this.sendRequest("_exec", { parameters: code2.toString() });
    } else {
      let results = await Promise.all(
        this.selection.map(
          async (nodeId) => await this.sendRequest(
            "_exec",
            { parameters: code2.toString(), selection: nodeId }
          )
        )
      );
      if (results.length === 1) return results[0];
      else return results;
    }
  }
  async exec_master(code2) {
    return await this.sendRequest("_exec_master", { parameters: code2.toString() });
  }
  handleErrors(error_obj) {
    let error = (0, import_serialize_error2.deserializeError)(error_obj);
    if (this.options.throwError) throw error;
    if (this.options.logError) console.error(error);
    if (this.options.returnError) return error;
    else return null;
  }
};
var ServiceClient_default = ServiceClient;

// src/service/Stash.ts
var Stash = class {
  constructor() {
    __publicField(this, "store", /* @__PURE__ */ new Map());
    __publicField(this, "queue", Promise.resolve());
  }
  /**
   * Internal method to serialize and validate JSON-serializable object
   */
  validateSerializable(value) {
    try {
      JSON.stringify(value);
    } catch (err) {
      throw new Error("Value must be JSON-serializable.");
    }
  }
  /**
   * Internal lock function to queue up tasks
   */
  async withLock(fn2) {
    let release;
    const next = new Promise((resolve) => release = resolve);
    const prev = this.queue;
    this.queue = next;
    await prev;
    try {
      return await fn2();
    } finally {
      release();
    }
  }
  async set(key, value) {
    if (value === void 0 || value === null) {
      value = key;
      key = "_default";
    }
    return this.withLock(async () => {
      this.store.set(key, value);
    });
  }
  async get(key) {
    if (key === void 0 || key === null || key === "")
      key = "_default";
    return this.withLock(async () => {
      return this.store.get(key);
    });
  }
  async delete(key) {
    if (key === void 0 || key === null || key === "")
      key = "_default";
    return this.withLock(async () => {
      this.store.delete(key);
    });
  }
  async clear() {
    return this.withLock(async () => {
      this.store.clear();
    });
  }
  async has(key) {
    if (key === void 0 || key === null || key === "")
      key = "_default";
    return this.withLock(async () => {
      return this.store.has(key);
    });
  }
  async keys() {
    return this.withLock(async () => {
      return Array.from(this.store.keys());
    });
  }
};
var Stash_default = Stash;

// src/service/Service.ts
var import_serialize_error3 = require("serialize-error");
var Service = class {
  constructor(params) {
    /* This will be the based class for the service which salvery will call to create proceses */
    __publicField(this, "name");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "nodes");
    __publicField(this, "stash", new Stash_default());
    __publicField(this, "processBalancer", null);
    __publicField(this, "requestQueue", null);
    __publicField(this, "nm_host");
    __publicField(this, "nm_port");
    __publicField(this, "number_of_nodes");
    __publicField(this, "masterCallback");
    __publicField(this, "slaveMethods");
    __publicField(this, "peerAddresses");
    __publicField(this, "peerDiscoveryAddress");
    __publicField(this, "peerDiscovery");
    __publicField(this, "cluster");
    __publicField(this, "network");
    __publicField(this, "options");
    __publicField(this, "servicesConnected", false);
    __publicField(this, "set", async (key, value = null) => await this.stash.set(key, value));
    __publicField(this, "get", async (key = "") => await this.stash.get(key));
    this.name = params.service_name;
    this.host = params.options?.host || "localhost";
    this.port = params?.options?.port || 0;
    this.nm_host = params.options?.nm_host || "localhost";
    this.nm_port = params.options?.nm_port || 0;
    this.masterCallback = params.mastercallback || void 0;
    this.slaveMethods = params.slaveMethods || {};
    this.peerAddresses = params.peerServicesAddresses || [];
    this.peerDiscoveryAddress = params.peerDiscoveryAddress || void 0;
    this.peerDiscovery = void 0;
    if (this.peerAddresses === void 0 && this.peerDiscoveryAddress === void 0)
      throw new Error("Peer Addresses or Peer Discovery Service Address must be defined");
    this.options = params.options || {};
    if (this.options.number_of_nodes === void 0) {
      this.number_of_nodes = 1;
      if (this.options.auto_scale === void 0)
        this.options.auto_scale = true;
    } else {
      this.number_of_nodes = this.options.number_of_nodes;
      if (this.options.auto_scale === void 0)
        this.options.auto_scale = false;
    }
  }
  async start() {
    this.cluster = new cluster_default(this.options);
    this.cluster.spawn("master_" + this.name, {
      allowedToSpawn: true,
      // give the ability to spawn new processes
      spawnOnlyFromPrimary: true
      // make sure that only one master process is created
    });
    if (this.cluster.is("master_" + this.name)) {
      await this.initialize_master();
    }
    if (this.cluster.is("slave_" + this.name)) {
      await this.initialize_slaves();
    }
  }
  async initialize_master() {
    if (this.port === 0) this.port = await (0, import_get_port.default)({ host: this.host });
    if (this.peerDiscoveryAddress !== void 0) await this.handle_peer_discovery();
    log_default("peer addresses", this.peerAddresses);
    await this.initlize_node_manager();
    this.initialize_request_queue();
    this.network = new network_default({ name: this.name + "_service_network" });
    let listeners = toListeners_default(this.slaveMethods).map(
      // add out handle request function to the listener
      (l) => ({ ...l, callback: this.handle_request(l, "run") })
    );
    let exec_listener = { event: "_exec", callback: () => {
    } };
    listeners.push({ ...exec_listener, callback: this.handle_request(exec_listener, "exec") });
    listeners = listeners.concat(this.getServiceListeners());
    this.network.createServer(this.name, this.host, this.port, listeners);
    this.initialize_process_balancer();
    this.peerAddresses = this.peerAddresses.filter((p) => p.name !== this.name);
    let connections = await this.network.connectAll(this.peerAddresses);
    let services = connections.map((c) => {
      let name = c.getTargetName();
      if (name === void 0) throw new Error("Service name is undefined");
      return new ServiceClient_default(name, this.network, this.options);
    }).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
    this.servicesConnected = true;
    if (this.masterCallback !== void 0)
      this.masterCallback({ ...services, slaves: this.nodes, master: this, self: this });
  }
  async initialize_slaves() {
    let node = new nodes_default();
    let metadata = process.env.metadata;
    if (metadata === void 0)
      throw new Error("could not get post and host of the node manager, metadata is undefined");
    let { host, port } = JSON.parse(metadata)["metadata"];
    await node.connectToMaster(host, port);
    await node.setServices(this.peerAddresses);
    node.addMethods(this.slaveMethods);
    await node._startup();
  }
  async initlize_node_manager() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.nm_port === 0)
      this.nm_port = await (0, import_get_port.default)({ host: this.nm_host });
    this.nodes = new NodeManager_default({
      name: this.name,
      host: this.nm_host,
      port: this.nm_port,
      stash: this.stash
      // set the stash
    });
    await this.nodes.spawnNodes("slave_" + this.name, this.number_of_nodes, {
      metadata: { host: this.nm_host, port: this.nm_port }
    });
    await this.nodes.registerServices(this.peerAddresses);
    return this.nodes;
  }
  initialize_request_queue() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.nodes === void 0) throw new Error("Node Manager is not defined");
    this.requestQueue = new RequestQueue_default({
      // we pass the functions that the request queue will use
      get_slave: this.nodes.getIdle.bind(this.nodes),
      process_request: async (node, request) => await node[request.type](request.method, request.parameters)
    });
  }
  initialize_process_balancer() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.options.auto_scale === true) {
      this.processBalancer = new ProcessBalancer_default({
        // pass the functions need for the balancer to know the hwo to balance
        checkQueueSize: this.requestQueue?.queueSize.bind(this.requestQueue),
        checkSlaves: () => ({ idleCount: this.nodes?.getIdleCount(), workingCount: this.nodes?.getBusyCount() }),
        addSlave: () => this.nodes?.spawnNodes("slave_" + this.name, 1, { metadata: { host: this.nm_host, port: this.nm_port } }),
        removeSlave: () => this.nodes?.killNode()
      });
    }
  }
  getServiceListeners() {
    let listeners = [{
      // get number of nodes
      event: "_get_nodes_count",
      callback: () => ({ result: this.nodes?.getNodeCount() })
    }, {
      event: "_get_nodes",
      callback: () => this.nodes?.getNodes().map((n) => ({ status: n.status, id: n.id }))
    }, {
      event: "_get_idle_nodes",
      // wee need to filter this array of objects
      callback: () => ({ result: this.nodes?.getIdleNodes() })
    }, {
      event: "_get_busy_nodes",
      // this one too
      callback: () => ({ result: this.nodes?.getBusyNodes() })
    }, {
      event: "_number_of_nodes_connected",
      params: ["node_num"],
      callback: async (node_num) => await this.nodes?.numberOfNodesConnected(node_num)
    }, {
      // select individual nodes, or groups of nodes
      event: "_select",
      params: ["node_num"],
      callback: async (node_num) => {
        if (this.nodes === void 0) throw new Error("Nodes are undefined");
        let count = this.nodes?.getNodeCount();
        if (count === void 0) return { isError: true, error: (0, import_serialize_error3.serializeError)(new Error("Nodes are undefined")) };
        if (node_num > count) return { isError: true, error: (0, import_serialize_error3.serializeError)(new Error("Not enough nodes")) };
        if (node_num === 0) node_num = count;
        let selected_nodes = [];
        for (let i = 0; i < node_num; i++) {
          let node = this.nodes?.nextNode();
          if (node === null) throw new Error("could not get node");
          selected_nodes.push(node.id);
        }
        return { result: selected_nodes };
      }
    }, {
      // spawn or kill a node
      event: "_add_node",
      params: ["number_of_nodes"],
      callback: (number_of_nodes) => ({ result: this.nodes?.spawnNodes(
        "slave_" + this.name,
        number_of_nodes,
        { metadata: { host: this.nm_host, port: this.nm_port } }
      ) })
    }, {
      // kill a node
      event: "_kill_node",
      params: ["node_id"],
      callback: async (node_ids) => {
        let res;
        if (node_ids === void 0) {
          res = await this.nodes?.killNode();
        } else if (typeof node_ids === "string") {
          res = await this.nodes?.killNode(node_ids);
        } else if (typeof node_ids === "number") {
          for (let i = 0; i < node_ids; i++) await this.nodes?.killNode();
        } else if (node_ids.length === 0) {
          res = await this.nodes?.killNode();
        } else if (node_ids.length >= 1) {
          res = await this.nodes?.killNodes(node_ids);
        } else {
          return { isError: true, error: (0, import_serialize_error3.serializeError)(new Error("Invalid node id")) };
        }
        return { result: res };
      }
    }, {
      // exit the service
      event: "_queue_size",
      callback: () => ({ result: this.requestQueue?.queueSize() })
    }, {
      event: "_turn_over_ratio",
      callback: () => ({ result: this.requestQueue?.getTurnoverRatio() })
    }, {
      event: "_exec_master",
      params: ["code_string"],
      callback: async (code_string) => {
        if (typeof code_string !== "string")
          return { isError: true, error: (0, import_serialize_error3.serializeError)(new Error("Code string is not a string")) };
        await await_interval_default(() => this.servicesConnected, 1e4).catch(() => {
          throw new Error(`[Service] Could not connect to the services`);
        });
        let service = this.getServices();
        let parameter = { ...service, master: this, self: this };
        try {
          let result2 = await execAsyncCode_default(code_string, parameter);
          return { result: result2 };
        } catch (e) {
          return { isError: true, error: (0, import_serialize_error3.serializeError)(e) };
        }
      }
    }, {
      event: "new_service",
      params: ["service_address"],
      callback: async (service_address) => {
        if (this.network === void 0) throw new Error("Network is not defined");
        await this.network?.connect(service_address);
      }
    }, {
      event: "exit",
      callback: () => ({ result: this.exit() })
    }];
    return listeners.map((l) => {
      return { ...l, callback: ({ parameters }) => l.callback(parameters) };
    });
  }
  handle_request(l, type) {
    return async (data) => {
      if (this.slaveMethods === void 0) throw new Error("Slave Methods are not defined");
      if (this.requestQueue === null)
        throw new Error("Request Queue is not defined");
      let promise = this.requestQueue.addRequest({
        method: l.event,
        type,
        parameters: data.parameters,
        selector: data.selection,
        completed: false,
        result: null
      });
      let result2 = await promise;
      if (result2.isError === true)
        result2.error = (0, import_serialize_error3.serializeError)(result2.error);
      return result2;
    };
  }
  async handle_peer_discovery() {
    if (this.peerDiscoveryAddress === void 0) throw new Error("Peer Discovery Address is not defined");
    if (this.cluster === void 0) throw new Error("Cluster is not defined");
    log_default(`[${this.name}] > Service > Checking if Peer Discovery Service is active`);
    log_default(`[${this.name}] > Service > Peer Discovery Address: ${this.peerDiscoveryAddress.host}:${this.peerDiscoveryAddress.port}`);
    if (await isServerActive_default(this.peerDiscoveryAddress) === false)
      throw new Error("Peer Discovery Service is not active");
    this.peerDiscovery = new PeerDiscoveryClient_default(this.peerDiscoveryAddress);
    await this.peerDiscovery.connect();
    this.peerDiscovery.register({ name: this.name, host: this.host, port: this.port });
    this.peerAddresses = await this.peerDiscovery.getServices();
  }
  getServices() {
    if (this.network === void 0) throw new Error("Network is not defined");
    let services = this.network.getServices();
    return services.map((c) => {
      let name = c.getTargetName();
      if (name === void 0) throw new Error("Service name is undefined");
      return new ServiceClient_default(name, this.network, this.options);
    }).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
  }
  exit() {
    setTimeout(() => {
      if (this.processBalancer) this.processBalancer.exit();
      if (this.requestQueue) this.requestQueue.exit();
      if (this.peerDiscovery) this.peerDiscovery.exit();
      if (this.nodes) this.nodes.exit();
      if (this.network) this.network.close();
      process.exit(0);
    }, 1e3);
    return true;
  }
};
var Service_default = Service;

// src/service/index.ts
var service_default = Service_default;

// src/app/typeGuards.ts
function isSlaveMethods(obj) {
  if (obj === null || obj === void 0) return false;
  return obj && typeof obj === "object" && Object.values(obj).some((value) => typeof value === "function");
}
function isMasterCallback(value) {
  if (value === null || value === void 0) return false;
  return typeof value === "function";
}

// src/app/entry.ts
var entry = (entryOptions) => {
  let options = entryOptions;
  let proxyObject = makeProxyObject_default(handleProxyCall(options));
  let peerDiscoveryServer = new peerDiscovery_default({
    host: options.host,
    port: options.port
  });
  peerDiscoveryServer.start();
  return proxyObject;
};
var handleProxyCall = (globalOptions) => (method, param1, param2, param3) => {
  const { mastercallback, slaveMethods, options } = paramertesDiscermination(param1, param2, param3);
  if (mastercallback === void 0) throw new Error("Master callback is undefined");
  const service_name = method;
  const port = globalOptions.port;
  const host = globalOptions.host;
  let service = new service_default({
    service_name,
    peerDiscoveryAddress: { host, port },
    mastercallback,
    slaveMethods,
    options
  });
  service.start();
};
var paramertesDiscermination = (param1, param2, param3) => {
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

// src/app/extractFunctions.ts
var esprima = __toESM(require("esprima"), 1);

// src/app/index.ts
var app_default = entry_default;

// src/index.ts
var index_default = app_default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Node,
  PeerDiscoverer,
  Service
});
//# sourceMappingURL=index.cjs.map