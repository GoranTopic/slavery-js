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
var PeerDiscoveryClient_exports = {};
__export(PeerDiscoveryClient_exports, {
  default: () => PeerDiscoveryClient_default
});
module.exports = __toCommonJS(PeerDiscoveryClient_exports);
var import_network = __toESM(require("../../network/index.js"), 1);
class PeerDiscoveryClient {
  // 2 seconds
  // get the network from the connection
  constructor({ host, port, name }) {
    /* this class will be used to connect to a the peer discovery server */
    __publicField(this, "name", "peer_discovery");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "network", new import_network.default({ name: "peer_discovery" }));
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
}
var PeerDiscoveryClient_default = PeerDiscoveryClient;
//# sourceMappingURL=PeerDiscoveryClient.cjs.map