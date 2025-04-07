"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var ipAndPort_exports = {};
__export(ipAndPort_exports, {
  findLocalIpOnSameNetwork: () => findLocalIpOnSameNetwork,
  getLocalIpAndSubnet: () => getLocalIpAndSubnet,
  getPort: () => import_get_port.default
});
module.exports = __toCommonJS(ipAndPort_exports);
var os = __toESM(require("os"), 1);
var ip = __toESM(require("ip"), 1);
var import_get_port = __toESM(require("get-port"), 1);
function getLocalIpAndSubnet() {
  const interfaces = os.networkInterfaces();
  const result = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        result.push({ ip: iface.address, subnet: iface.netmask });
      }
    }
  }
  return result;
}
function isSameNetwork(localIp, localSubnet, targetIp) {
  const localSubnetInfo = ip.subnet(localIp, localSubnet);
  const targetSubnetInfo = ip.subnet(targetIp, localSubnet);
  return localSubnetInfo.networkAddress === targetSubnetInfo.networkAddress;
}
function findLocalIpOnSameNetwork(targetIp) {
  if (targetIp === "localhost") targetIp = "127.0.0.1";
  if (ip.isLoopback(targetIp) && ip.isPrivate(targetIp))
    return targetIp;
  const localNetworks = getLocalIpAndSubnet();
  for (const network of localNetworks) {
    if (isSameNetwork(network.ip, network.subnet, targetIp)) {
      return network.ip;
    }
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findLocalIpOnSameNetwork,
  getLocalIpAndSubnet,
  getPort
});
//# sourceMappingURL=ipAndPort.cjs.map