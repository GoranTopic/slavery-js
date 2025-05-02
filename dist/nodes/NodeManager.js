import {
  __publicField
} from "../chunk-V6TY7KAL.js";
import Cluster from "../cluster/index.js";
import Network from "../network/index.js";
import Node from "./Node.js";
import { Pool, await_interval, log } from "../utils/index.js";
class NodeManager {
  constructor(options) {
    __publicField(this, "name");
    __publicField(this, "network");
    //private heartBeat: number = 1000;
    __publicField(this, "nodes", new Pool());
    __publicField(this, "options");
    __publicField(this, "cluster", new Cluster({}));
    __publicField(this, "services", []);
    __publicField(this, "stash");
    __publicField(this, "setIdle", (NodeId) => this.nodes.enable(NodeId));
    __publicField(this, "setBusy", (NodeId) => this.nodes.disable(NodeId));
    /* synonims */
    __publicField(this, "addNode", this.spawnNodes);
    __publicField(this, "removeNode", this.killNodes);
    __publicField(this, "getNumberOfNodes", this.getNodeCount);
    this.name = options.name;
    this.options = options;
    this.network = new Network({ name: this.name + "_node_manager" });
    this.network.createServer(
      this.name + "_node_manager",
      this.options.host,
      this.options.port
    );
    this.network.onNodeConnection(this.handleNewNode.bind(this));
    this.network.onNodeDisconnect(this.handleNodeDisconnect.bind(this));
    this.stash = options.stash || null;
  }
  handleNewNode(connection) {
    log("[Node manager] Got a new connectection from a node");
    let node = new Node();
    node.setStashFunctions({
      get: async (key) => await this.stash?.get(key),
      set: async (key, value) => await this.stash?.set(key, value)
    });
    node.setNodeConnection(connection, this.network);
    node.setServices(this.services);
    node.setStatusChangeCallback(this.handleStatusChange.bind(this));
    let id = node.getId();
    if (id === void 0) throw new Error("node id is undefined");
    this.nodes.add(id, node);
    this.setIdle(id);
  }
  handleNodeDisconnect(connection) {
    let id = connection.getId();
    if (id === void 0) throw new Error("node id is undefined");
    this.nodes.remove(id);
  }
  handleStatusChange(status, node) {
    if (!status) throw new Error("status is undefined");
    let id = node.getId();
    if (id === void 0) throw new Error("node id is undefined");
    if (node.isIdle() || node.isError())
      this.setIdle(id);
    else if (node.isBusy())
      this.setBusy(id);
    else
      throw new Error("invalid node status");
  }
  async getIdle(node_id = "") {
    if (node_id !== "") {
      let node2 = this.getNode(node_id);
      await await_interval(() => node2.isIdle(), 60 * 60 * 60 * 1e3).catch(() => {
        throw new Error(`timeout of one hour, node ${node_id} is not idle`);
      });
      return node2;
    }
    if (this.nodes.isEmpty())
      log("[node manager] (WARNING) no nodes found");
    await await_interval(() => this.nodes.hasEnabled(), 0).catch(() => {
      throw new Error("timeout of 10 seconds, no idle node found");
    });
    let node = this.nodes.pop();
    if (node === null) throw new Error("node is null");
    return node;
  }
  getBusy() {
    return this.nodes.getDisabled().pop();
  }
  getIdleNodes() {
    return this.nodes.getEnabledObjects();
  }
  getBusyNodes() {
    return this.nodes.getDisabledObjects();
  }
  async forEach(callback) {
    let nodes = this.nodes.toArray();
    let promises = nodes.map(async (node) => {
      if (node.isBusy()) await node.toFinish();
      return callback(node);
    });
    return Promise.all(promises);
  }
  async setServices(services) {
    this.services = services;
    if (this.nodes.size() > 0)
      await this.broadcast(async (node) => {
        await node.setServices(services);
      });
  }
  async spawnNodes(name = "", count = 1, metadata = {}) {
    if (name === "") name = "node_" + this.name;
    log("[nodeManager][spawnNodes] spawning nodes", name, count);
    this.cluster.spawn(name, {
      numberOfSpawns: count,
      metadata
    });
  }
  async killNode(nodeId = "") {
    if (this.nodes.isEmpty())
      return false;
    let node = nodeId === "" ? this.nodes.removeOne() : this.nodes.remove(nodeId);
    if (node === null || node === void 0)
      throw new Error("Node sentenced to death could not be found");
    await node.exit();
  }
  async killNodes(nodesId = []) {
    for (let nodeId of nodesId)
      await this.killNode(nodeId);
  }
  getIdleCount() {
    return this.nodes.getEnabledCount();
  }
  getBusyCount() {
    return this.nodes.getDisabledCount();
  }
  getNodes() {
    return this.nodes.toArray();
  }
  nextNode() {
    return this.nodes.next();
  }
  getNodeCount() {
    return this.nodes.size();
  }
  getNode(nodeId) {
    let node = this.nodes.get(nodeId);
    if (node === null) throw new Error(`[node manager] (ERROR) selected node ${nodeId} not found`);
    return node;
  }
  getListeners() {
    if (this.network === void 0) throw new Error("network is undefined");
    return this.network.getRegisteredListeners();
  }
  async numberOfNodesConnected(count) {
    let timeout = 1e5;
    await await_interval(() => this.nodes.size() >= count, timeout).catch(() => {
      throw new Error(`timeout of ${timeout} seconds, not enough nodes connected`);
    });
    return true;
  }
  async exit() {
    return this.broadcast(
      async (node) => await node.exit()
    );
  }
  async broadcast(callback) {
    let nodes = this.nodes.toArray();
    let promises = nodes.map(
      async (node) => await callback(node)
    );
    return Promise.all(promises);
  }
}
var NodeManager_default = NodeManager;
export {
  NodeManager_default as default
};
//# sourceMappingURL=NodeManager.js.map