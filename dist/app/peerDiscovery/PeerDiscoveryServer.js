import {
  __publicField
} from "../../chunk-V6TY7KAL.js";
import Network from "../../network/index.js";
import Cluster from "../../cluster/index.js";
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
    this.cluster = new Cluster({ name: this.name });
    this.cluster.spawn(this.name, {
      spawnOnlyFromPrimary: true
      // make sure that only one the primary process can spawn this service
    });
    if (this.cluster.is("peer_discovery")) {
      this.network = new Network({ name: this.name + "_network" });
      let listeners = this.getListeners();
      this.network.createServer(this.name, this.host, this.port, listeners);
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
export {
  PeerDiscoveryServer_default as default
};
//# sourceMappingURL=PeerDiscoveryServer.js.map