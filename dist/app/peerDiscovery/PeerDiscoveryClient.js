import {
  __publicField
} from "../../chunk-V6TY7KAL.js";
import Network from "../../network/index.js";
class PeerDiscoveryClient {
  // 2 seconds
  // get the network from the connection
  constructor({ host, port, name }) {
    /* this class will be used to connect to a the peer discovery server */
    __publicField(this, "name", "peer_discovery");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "network", new Network({ name: "peer_discovery" }));
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
export {
  PeerDiscoveryClient_default as default
};
//# sourceMappingURL=PeerDiscoveryClient.js.map