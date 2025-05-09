import "./chunk-V6TY7KAL.js";
import entry, { PeerDiscoverer } from "./app/index.js";
import Node from "./nodes/index.js";
import Service from "./service/index.js";
import { log } from "./utils/index.js";
process.on("unhandledRejection", (reason, promise) => {
  log("[CRITICAL] Unhandled Promise Rejection:", reason);
});
var index_default = entry;
export {
  Node,
  PeerDiscoverer,
  Service,
  index_default as default
};
//# sourceMappingURL=index.js.map