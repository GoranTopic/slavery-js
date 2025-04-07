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
var service_exports = {};
__export(service_exports, {
  ProcessBalancer: () => import_ProcessBalancer.default,
  RequestQueue: () => import_RequestQueue.default,
  ServiceClient: () => import_ServiceClient.default,
  Stash: () => import_Stash.default,
  default: () => service_default
});
module.exports = __toCommonJS(service_exports);
var import_Service = __toESM(require("./Service.js"), 1);
var import_ServiceClient = __toESM(require("./ServiceClient.js"), 1);
var import_RequestQueue = __toESM(require("./RequestQueue.js"), 1);
var import_ProcessBalancer = __toESM(require("./ProcessBalancer.js"), 1);
var import_Stash = __toESM(require("./Stash.js"), 1);
var service_default = import_Service.default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProcessBalancer,
  RequestQueue,
  ServiceClient,
  Stash
});
//# sourceMappingURL=index.cjs.map