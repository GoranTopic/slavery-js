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
var Connection_exports = {};
__export(Connection_exports, {
  default: () => Connection_default
});
module.exports = __toCommonJS(Connection_exports);
var import_socket = require("socket.io-client");
function isServer(params) {
  return "host" in params && "port" in params && "id" in params;
}
function isClient(params) {
  return "socket" in params && "name" in params;
}
class Connection {
  /*
   * @param Node: Node
   * @param socket: Socket
   * @param host: string
   * @param port: number
   * @param id: string
   * @param name: string
   * */
  constructor(params) {
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
    __publicField(this, "options");
    __publicField(this, "send", this.query);
    this.options = {
      // callbacks
      onConnect: params?.options?.onConnect || (() => {
      }),
      onDisconnect: params?.options?.onDisconnect || (() => {
      }),
      onSetListeners: params?.options?.onSetListeners || (() => {
      }),
      // listeners
      listeners: params?.options?.listeners || [],
      // timeout
      timeout: params?.options?.timeout || 5 * 60 * 1e3
      // 5 minutes
    };
    if (isClient(params)) {
      params = params;
      this.type = "server";
      this.name = params.name;
      this.targetType = "client";
      this.socket = params.socket;
      this.targetId = params.socket.handshake.auth.id;
      this.isConnected = true;
    } else if (isServer(params)) {
      params = params;
      this.type = "client";
      this.targetType = "server";
      this.id = params.id;
      this.socket = (0, import_socket.io)(`ws://${params.host}:${params.port}`, {
        auth: { id: params.id },
        timeout: this.options.timeout || 5 * 60 * 1e3
        // default 5 minutes
      });
      this.isConnected = false;
    } else
      throw new Error("Connection must have either a socket and a name or a host and port");
    this.socketId = this.socket.id;
    this.initilaizeListeners();
  }
  initilaizeListeners() {
    this.options.listeners.forEach((l) => {
      this.socket.removeAllListeners(l.event);
      this.socket.on(l.event, this.respond(l.event, async (parameters) => {
        return await l.callback(parameters);
      }));
    });
    this.socket.on("_listeners", this.respond("_listeners", () => this.getListeners()));
    this.socket.on("_set_listeners", this.respond("_set_listeners", (listeners) => {
      this.targetListeners = listeners.map((event) => ({ event, callback: () => {
      } }));
      this.options.onSetListeners(this.targetListeners);
      return "ok";
    }));
    this.socket.on("_name", this.respond("_name", () => this.name));
    this.socket.on("_id", () => this.id);
    this.socket.on("connect", async () => {
      this.targetName = await this.queryTargetName();
      this.targetListeners = await this.queryTargetListeners();
      this.isConnected = true;
      this.options.onConnect(this);
    });
    this.socket.on("reconnect", async (attempt) => {
      this.targetName = await this.queryTargetName();
      this.targetListeners = await this.queryTargetListeners();
      this.isConnected = true;
      this.options.onConnect(this);
    });
    this.socket.on("diconnect", () => {
      this.isConnected = false;
      this.options.onDisconnect(this);
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
      this.options.listeners.push(l);
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
    const eventMap = new Map(this.options.listeners.map((l) => [l.event, l]));
    listeners.forEach((l) => eventMap.set(l.event, l));
    this.options.listeners = Array.from(eventMap.values());
    this.setListeners(this.options.listeners);
  }
  getTargetListeners() {
    return this.targetListeners;
  }
  onSetListeners(callback) {
    this.options.onSetListeners = callback;
  }
  onConnect(callback) {
    this.options.onConnect = callback;
  }
  onDisconnect(callback) {
    this.options.onDisconnect = callback;
  }
  queryTargetListeners() {
    return this.query("_listeners");
  }
  queryTargetName() {
    return this.query("_name");
  }
  async query(event, data, retries = 3, retryDelay = 500) {
    let attempt = 0;
    const tryQuery = () => {
      return new Promise((resolve, reject) => {
        const request_id = ++this.request_id;
        if (this.request_id >= Number.MAX_SAFE_INTEGER - 1) this.request_id = 0;
        const responseEvent = `${event}_${request_id}_response`;
        const timeoutDuration = this.options.timeout || 5e3;
        const timeout = setTimeout(() => {
          this.socket.removeAllListeners(responseEvent);
          reject(new Error(`Query '${event}' timed out after ${timeoutDuration}ms (attempt ${attempt + 1})`));
        }, timeoutDuration);
        this.socket.once(responseEvent, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
        this.socket.emit(event, { data, request_id });
      });
    };
    while (attempt <= retries) {
      try {
        return await tryQuery();
      } catch (err) {
        if (attempt >= retries) {
          throw new Error(`Query '${event}' failed after ${retries + 1} attempts: ${err}`);
        }
        attempt++;
        await new Promise((r) => setTimeout(r, retryDelay)).catch((e) => {
          throw new Error(`Error during retry delay: ${e}`);
        });
      }
    }
    throw new Error("Unexpected query failure");
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
      return this.options.listeners;
    else if (this.type === "client")
      return this.socket._callbacks;
    else
      throw new Error("Connection type not recognized");
  }
  close() {
    this.socket.disconnect();
  }
}
var Connection_default = Connection;
//# sourceMappingURL=Connection.cjs.map