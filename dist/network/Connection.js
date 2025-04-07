import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import { io } from "socket.io-client";
class Connection {
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
      this.socket = io(`ws://${host}:${port}`, {
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
}
var Connection_default = Connection;
export {
  Connection_default as default
};
//# sourceMappingURL=Connection.js.map