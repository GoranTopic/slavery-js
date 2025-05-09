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
var index_exports = {};
__export(index_exports, {
  Node: () => import_nodes.default,
  PeerDiscoverer: () => import_app.PeerDiscoverer,
  Service: () => import_service.default,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_app = __toESM(require("./app/index.js"), 1);
var import_nodes = __toESM(require("./nodes/index.js"), 1);
var import_service = __toESM(require("./service/index.js"), 1);
var import_utils = require("./utils/index.js");
process.on("unhandledRejection", (reason, promise) => {
  (0, import_utils.log)("[CRITICAL] Unhandled Promise Rejection:", reason);
});
var index_default = import_app.default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Node,
  PeerDiscoverer,
  Service
});
//# sourceMappingURL=index.cjs.map