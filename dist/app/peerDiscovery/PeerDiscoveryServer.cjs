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
var PeerDiscoveryServer_exports = {};
__export(PeerDiscoveryServer_exports, {
  default: () => PeerDiscoveryServer_default
});
module.exports = __toCommonJS(PeerDiscoveryServer_exports);
var import_network = __toESM(require("../../network/index.js"), 1);
var import_cluster = __toESM(require("../../cluster/index.js"), 1);
var import_utils = require("../../utils/index.js");
class PeerDicoveryServer {
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
    this.cluster = new import_cluster.default({ name: this.name });
    this.cluster.spawn(this.name, {
      spawnOnlyFromPrimary: true
      // make sure that only one the primary process can spawn this service
    });
    if (this.cluster.is("peer_discovery")) {
      this.network = new import_network.default({ name: this.name + "_network" });
      let listeners = this.getListeners();
      try {
        this.network.createServer(this.name, this.host, this.port, listeners);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Host and port already in use or invalid")) {
          (0, import_utils.log)(`Port ${this.port} is already in use. Exiting...`);
          process.exit(0);
        } else throw error;
      }
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
}
var PeerDiscoveryServer_default = PeerDicoveryServer;
//# sourceMappingURL=PeerDiscoveryServer.cjs.map