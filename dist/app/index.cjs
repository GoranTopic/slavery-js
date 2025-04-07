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
var app_exports = {};
__export(app_exports, {
  PeerDiscoverer: () => import_peerDiscovery.default,
  default: () => app_default,
  extractFunctions: () => import_extractFunctions.default,
  isMasterCallback: () => import_typeGuards.isMasterCallback,
  isServiceOptions: () => import_typeGuards.isServiceOptions,
  isSlaveMethods: () => import_typeGuards.isSlaveMethods,
  makeProxyObject: () => import_makeProxyObject.default
});
module.exports = __toCommonJS(app_exports);
var import_entry = __toESM(require("./entry.js"), 1);
var import_typeGuards = require("./typeGuards.js");
var import_makeProxyObject = __toESM(require("./makeProxyObject.js"), 1);
var import_extractFunctions = __toESM(require("./extractFunctions.js"), 1);
var import_peerDiscovery = __toESM(require("./peerDiscovery/index.js"), 1);
var app_default = import_entry.default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PeerDiscoverer,
  extractFunctions,
  isMasterCallback,
  isServiceOptions,
  isSlaveMethods,
  makeProxyObject
});
//# sourceMappingURL=index.cjs.map