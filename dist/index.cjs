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
  DistributedBalancer: () => import_distributed.DistributedBalancer,
  DistributedService: () => import_distributed.DistributedService,
  DistributedWorker: () => import_distributed.DistributedWorker,
  DockerOrchestrator: () => import_orchestration.DockerOrchestrator,
  K8sOrchestrator: () => import_orchestration.K8sOrchestrator,
  ManifestTemplate: () => import_orchestration.ManifestTemplate,
  Node: () => import_nodes.default,
  PeerClient: () => import_distributed2.PeerClient,
  PeerDiscoverer: () => import_app.PeerDiscoverer,
  RedisQueue: () => import_distributed.RedisQueue,
  RedisStash: () => import_distributed.RedisStash,
  Service: () => import_service.default,
  ServiceBus: () => import_distributed2.ServiceBus,
  ServiceRegistry: () => import_distributed2.ServiceRegistry,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_app = __toESM(require("./app/index.js"), 1);
var import_nodes = __toESM(require("./nodes/index.js"), 1);
var import_service = __toESM(require("./service/index.js"), 1);
var import_utils = require("./utils/index.js");
var import_distributed = require("./distributed/index.js");
var import_distributed2 = require("./distributed/index.js");
var import_orchestration = require("./cluster/orchestration/index.js");
process.on("unhandledRejection", (reason, promise) => {
  (0, import_utils.log)("[CRITICAL] Unhandled Promise Rejection:", reason);
});
var index_default = import_app.default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DistributedBalancer,
  DistributedService,
  DistributedWorker,
  DockerOrchestrator,
  K8sOrchestrator,
  ManifestTemplate,
  Node,
  PeerClient,
  PeerDiscoverer,
  RedisQueue,
  RedisStash,
  Service,
  ServiceBus,
  ServiceRegistry
});
//# sourceMappingURL=index.cjs.map