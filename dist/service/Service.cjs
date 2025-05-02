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
var Service_exports = {};
__export(Service_exports, {
  default: () => Service_default
});
module.exports = __toCommonJS(Service_exports);
var import_network = __toESM(require("../network/index.js"), 1);
var import_nodes = __toESM(require("../nodes/index.js"), 1);
var import_cluster = __toESM(require("../cluster/index.js"), 1);
var import_peerDiscovery = require("../app/peerDiscovery/index.js");
var import_RequestQueue = __toESM(require("./RequestQueue.js"), 1);
var import_ProcessBalancer = __toESM(require("./ProcessBalancer.js"), 1);
var import_ServiceClient = __toESM(require("./ServiceClient.js"), 1);
var import_Stash = __toESM(require("./Stash.js"), 1);
var import_utils = require("../utils/index.js");
var import_serialize_error = require("serialize-error");
class Service {
  constructor(params) {
    /* This will be the based class for the service which salvery will call to create proceses */
    __publicField(this, "name");
    __publicField(this, "host");
    __publicField(this, "port");
    __publicField(this, "nodes");
    __publicField(this, "stash", new import_Stash.default());
    __publicField(this, "processBalancer", null);
    __publicField(this, "requestQueue", null);
    __publicField(this, "nm_host");
    __publicField(this, "nm_port");
    __publicField(this, "number_of_nodes");
    __publicField(this, "masterCallback");
    __publicField(this, "slaveMethods");
    __publicField(this, "peerAddresses");
    __publicField(this, "peerDiscoveryAddress");
    __publicField(this, "peerDiscovery");
    __publicField(this, "cluster");
    __publicField(this, "network");
    __publicField(this, "options");
    __publicField(this, "servicesConnected", false);
    __publicField(this, "set", async (key, value = null) => await this.stash.set(key, value));
    __publicField(this, "get", async (key = "") => await this.stash.get(key));
    this.name = params.service_name;
    this.host = params.options?.host || "localhost";
    this.port = params?.options?.port || 0;
    this.nm_host = params.options?.nm_host || "localhost";
    this.nm_port = params.options?.nm_port || 0;
    this.masterCallback = params.mastercallback || void 0;
    this.slaveMethods = params.slaveMethods || {};
    this.peerAddresses = params.peerServicesAddresses || [];
    this.peerDiscoveryAddress = params.peerDiscoveryAddress || void 0;
    this.peerDiscovery = void 0;
    if (this.peerAddresses === void 0 && this.peerDiscoveryAddress === void 0)
      throw new Error("Peer Addresses or Peer Discovery Service Address must be defined");
    this.options = params.options || {};
    if (this.options.number_of_nodes === void 0) {
      this.number_of_nodes = 1;
      if (this.options.auto_scale === void 0)
        this.options.auto_scale = true;
    } else {
      this.number_of_nodes = this.options.number_of_nodes;
      if (this.options.auto_scale === void 0)
        this.options.auto_scale = false;
    }
  }
  async start() {
    this.cluster = new import_cluster.default(this.options);
    this.cluster.spawn("master_" + this.name, {
      allowedToSpawn: true,
      // give the ability to spawn new processes
      spawnOnlyFromPrimary: true
      // make sure that only one master process is created
    });
    if (this.cluster.is("master_" + this.name)) {
      await this.initialize_master();
    }
    if (this.cluster.is("slave_" + this.name)) {
      await this.initialize_slaves();
    }
  }
  async initialize_master() {
    if (this.port === 0) this.port = await (0, import_utils.getPort)({ host: this.host });
    if (this.peerDiscoveryAddress !== void 0) await this.handle_peer_discovery();
    (0, import_utils.log)("peer addresses", this.peerAddresses);
    await this.initlize_node_manager();
    this.initialize_request_queue();
    this.network = new import_network.default({ name: this.name + "_service_network" });
    let listeners = (0, import_utils.toListeners)(this.slaveMethods).map(
      // add out handle request function to the listener
      (l) => ({ ...l, callback: this.handle_request(l, "run") })
    );
    let exec_listener = { event: "_exec", callback: () => {
    } };
    listeners.push({ ...exec_listener, callback: this.handle_request(exec_listener, "exec") });
    listeners = listeners.concat(this.getServiceListeners());
    this.network.createServer(this.name, this.host, this.port, listeners);
    this.initialize_process_balancer();
    this.peerAddresses = this.peerAddresses.filter((p) => p.name !== this.name);
    let connections = await this.network.connectAll(this.peerAddresses);
    let services = connections.map((c) => {
      let name = c.getTargetName();
      if (name === void 0) throw new Error("Service name is undefined");
      return new import_ServiceClient.default(name, this.network, this.options);
    }).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
    this.servicesConnected = true;
    if (this.masterCallback !== void 0)
      this.masterCallback({ ...services, slaves: this.nodes, master: this, self: this });
  }
  async initialize_slaves() {
    let node = new import_nodes.default({ methods: this.slaveMethods });
    let metadata = process.env.metadata;
    if (metadata === void 0)
      throw new Error("could not get post and host of the node manager, metadata is undefined");
    let { host, port } = JSON.parse(metadata)["metadata"];
    await node.connectToMaster(host, port);
  }
  async initlize_node_manager() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.nm_port === 0)
      this.nm_port = await (0, import_utils.getPort)({ host: this.nm_host });
    this.nodes = new import_nodes.NodeManager({
      name: this.name,
      host: this.nm_host,
      port: this.nm_port,
      stash: this.stash
      // set the stash
    });
    await this.nodes.spawnNodes("slave_" + this.name, this.number_of_nodes, {
      metadata: { host: this.nm_host, port: this.nm_port }
    });
    await this.nodes.setServices(this.peerAddresses);
    return this.nodes;
  }
  initialize_request_queue() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.nodes === void 0) throw new Error("Node Manager is not defined");
    this.requestQueue = new import_RequestQueue.default({
      // we pass the functions that the request queue will use
      get_slave: this.nodes.getIdle.bind(this.nodes),
      process_request: async (node, request) => await node[request.type](request.method, request.parameters)
    });
  }
  initialize_process_balancer() {
    if (Object.keys(this.slaveMethods).length === 0) return null;
    if (this.options.auto_scale === true) {
      this.processBalancer = new import_ProcessBalancer.default({
        // pass the functions need for the balancer to know the hwo to balance
        checkQueueSize: this.requestQueue?.queueSize.bind(this.requestQueue),
        checkSlaves: () => ({ idleCount: this.nodes?.getIdleCount(), workingCount: this.nodes?.getBusyCount() }),
        addSlave: () => this.nodes?.spawnNodes("slave_" + this.name, 1, { metadata: { host: this.nm_host, port: this.nm_port } }),
        removeSlave: () => this.nodes?.killNode()
      });
    }
  }
  getServiceListeners() {
    let listeners = [{
      // get number of nodes
      event: "_get_nodes_count",
      callback: () => ({ result: this.nodes?.getNodeCount() })
    }, {
      event: "_get_nodes",
      callback: () => this.nodes?.getNodes().map((n) => ({ status: n.status, id: n.id }))
    }, {
      event: "_get_idle_nodes",
      // wee need to filter this array of objects
      callback: () => ({ result: this.nodes?.getIdleNodes() })
    }, {
      event: "_get_busy_nodes",
      // this one too
      callback: () => ({ result: this.nodes?.getBusyNodes() })
    }, {
      event: "_number_of_nodes_connected",
      params: ["node_num"],
      callback: async (node_num) => await this.nodes?.numberOfNodesConnected(node_num)
    }, {
      // select individual nodes, or groups of nodes
      event: "_select",
      params: ["node_num"],
      callback: async (node_num) => {
        if (this.nodes === void 0) throw new Error("Nodes are undefined");
        let count = this.nodes?.getNodeCount();
        if (count === void 0) return { isError: true, error: (0, import_serialize_error.serializeError)(new Error("Nodes are undefined")) };
        if (node_num > count) return { isError: true, error: (0, import_serialize_error.serializeError)(new Error("Not enough nodes")) };
        if (node_num === 0) node_num = count;
        let selected_nodes = [];
        for (let i = 0; i < node_num; i++) {
          let node = this.nodes?.nextNode();
          if (node === null) throw new Error("could not get node");
          selected_nodes.push(node.id);
        }
        return { result: selected_nodes };
      }
    }, {
      // spawn or kill a node
      event: "_add_node",
      params: ["number_of_nodes"],
      callback: (number_of_nodes) => ({ result: this.nodes?.spawnNodes(
        "slave_" + this.name,
        number_of_nodes,
        { metadata: { host: this.nm_host, port: this.nm_port } }
      ) })
    }, {
      // kill a node
      event: "_kill_node",
      params: ["node_id"],
      callback: async (node_ids) => {
        let res;
        if (node_ids === void 0) {
          res = await this.nodes?.killNode();
        } else if (typeof node_ids === "string") {
          res = await this.nodes?.killNode(node_ids);
        } else if (typeof node_ids === "number") {
          for (let i = 0; i < node_ids; i++) await this.nodes?.killNode();
        } else if (node_ids.length === 0) {
          res = await this.nodes?.killNode();
        } else if (node_ids.length >= 1) {
          res = await this.nodes?.killNodes(node_ids);
        } else {
          return { isError: true, error: (0, import_serialize_error.serializeError)(new Error("Invalid node id")) };
        }
        return { result: res };
      }
    }, {
      // exit the service
      event: "_queue_size",
      callback: () => ({ result: this.requestQueue?.queueSize() })
    }, {
      event: "_turn_over_ratio",
      callback: () => ({ result: this.requestQueue?.getTurnoverRatio() })
    }, {
      event: "_exec_master",
      params: ["code_string"],
      callback: async (code_string) => {
        if (typeof code_string !== "string")
          return { isError: true, error: (0, import_serialize_error.serializeError)(new Error("Code string is not a string")) };
        await (0, import_utils.await_interval)(() => this.servicesConnected, 1e4).catch(() => {
          throw new Error(`[Service] Could not connect to the services`);
        });
        let service = this.getServices();
        let parameter = { ...service, master: this, self: this };
        try {
          let result = await (0, import_utils.execAsyncCode)(code_string, parameter);
          return { result };
        } catch (e) {
          return { isError: true, error: (0, import_serialize_error.serializeError)(e) };
        }
      }
    }, {
      event: "new_service",
      params: ["service_address"],
      callback: async (service_address) => {
        if (this.network === void 0) throw new Error("Network is not defined");
        await this.network?.connect(service_address);
      }
    }, {
      event: "exit",
      callback: () => ({ result: this.exit() })
    }];
    return listeners.map((l) => {
      return { ...l, callback: ({ parameters }) => l.callback(parameters) };
    });
  }
  handle_request(l, type) {
    return async (data) => {
      if (this.slaveMethods === void 0) throw new Error("Slave Methods are not defined");
      if (this.requestQueue === null)
        throw new Error("Request Queue is not defined");
      let promise = this.requestQueue.addRequest({
        method: l.event,
        type,
        parameters: data.parameters,
        selector: data.selection,
        completed: false,
        result: null
      });
      let result = await promise;
      if (result.isError === true)
        result.error = (0, import_serialize_error.serializeError)(result.error);
      return result;
    };
  }
  async handle_peer_discovery() {
    if (this.peerDiscoveryAddress === void 0) throw new Error("Peer Discovery Address is not defined");
    if (this.cluster === void 0) throw new Error("Cluster is not defined");
    (0, import_utils.log)(`[${this.name}] > Service > Checking if Peer Discovery Service is active`);
    (0, import_utils.log)(`[${this.name}] > Service > Peer Discovery Address: ${this.peerDiscoveryAddress.host}:${this.peerDiscoveryAddress.port}`);
    let serverIsActive = await (0, import_utils.isServerActive)(this.peerDiscoveryAddress);
    if (serverIsActive === false)
      throw new Error("Peer Discovery Service is not active");
    this.peerDiscovery = new import_peerDiscovery.PeerDiscoveryClient(this.peerDiscoveryAddress);
    await this.peerDiscovery.connect();
    this.peerDiscovery.register({ name: this.name, host: this.host, port: this.port });
    this.peerAddresses = await this.peerDiscovery.getServices();
  }
  getServices() {
    if (this.network === void 0) throw new Error("Network is not defined");
    let services = this.network.getServices();
    return services.map((c) => {
      let name = c.getTargetName();
      if (name === void 0) throw new Error("Service name is undefined");
      return new import_ServiceClient.default(name, this.network, this.options);
    }).reduce((acc, s) => {
      acc[s.name] = s;
      return acc;
    }, {});
  }
  exit() {
    setTimeout(() => {
      if (this.processBalancer) this.processBalancer.exit();
      if (this.requestQueue) this.requestQueue.exit();
      if (this.peerDiscovery) this.peerDiscovery.exit();
      if (this.nodes) this.nodes.exit();
      if (this.network) this.network.close();
      process.exit(0);
    }, 1e3);
    return true;
  }
}
var Service_default = Service;
//# sourceMappingURL=Service.cjs.map