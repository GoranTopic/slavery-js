import Cluster from '../cluster/index.js';
import Network from '../network/index.js';
import Node from './Node.js';
import { Pool, await_interval, log } from '../utils/index.js';
class NodeManager {
    name;
    network;
    //private heartBeat: number = 1000;
    nodes = new Pool();
    options;
    cluster = new Cluster({});
    stash;
    constructor(options) {
        this.name = options.name;
        this.options = options;
        this.network = new Network({ name: this.name + '_node_manager' });
        // create server
        this.network.createServer(this.name + '_node_manager', this.options.host, this.options.port);
        // handle when new node is connected
        this.network.onNodeConnection(this.handleNewNode.bind(this));
        // handle when a node is disconnected
        this.network.onNodeDisconnect(this.handleNodeDisconnect.bind(this));
        // set the stash
        this.stash = options.stash || null;
    }
    handleNewNode(connection) {
        /* this function is called when a new node is connected to the master */
        log('[Node manager] Got a new connectection from a node');
        // create a new node
        let node = new Node();
        // set the functions for the stash of objects
        node.setStashFunctions({
            get: async (key) => await this.stash?.get(key),
            set: async (key, value) => await this.stash?.set(key, value),
        });
        // set the connection to the node
        node.setNodeConnection(connection, this.network);
        // add callback on status change
        node.setStatusChangeCallback(this.handleStatusChange.bind(this));
        // get the id of the node
        let id = node.getId();
        if (id === undefined)
            throw new Error('node id is undefined');
        // add to the pool
        this.nodes.add(id, node);
        // add to the enabled pool
        this.setIdle(id);
    }
    handleNodeDisconnect(connection) {
        // get the node id
        let id = connection.getId();
        if (id === undefined)
            throw new Error('node id is undefined');
        // remove the node from the pool
        this.nodes.remove(id);
    }
    handleStatusChange(status, node) {
        // if the node is idle add it to the enabled pool
        // if the node is busy add it to the disabled pool
        if (!status)
            throw new Error('status is undefined');
        let id = node.getId();
        if (id === undefined)
            throw new Error('node id is undefined');
        if (node.isIdle() || node.isError())
            this.setIdle(id);
        else if (node.isBusy())
            this.setBusy(id);
        else
            throw new Error('invalid node status');
    }
    async getIdle(node_id = '') {
        /* this function return a node that is idle */
        if (node_id !== '') { // we are looking for a specific node on the pool
            let node = this.getNode(node_id);
            // await for seelcted node to be idle
            await await_interval(() => node.isIdle(), 60 * 60 * 60 * 1000).catch(() => {
                throw new Error(`timeout of one hour, node ${node_id} is not idle`);
            });
            return node;
        }
        // check if there are nodes in the pool
        if (this.nodes.isEmpty())
            log('[node manager] (WARNING) no nodes found');
        // await until we get a node which is idle
        // 0 will make it wait for every for a idle node
        await await_interval(() => this.nodes.hasEnabled(), 0)
            .catch(() => { throw new Error('timeout of 10 seconds, no idle node found'); });
        //log('[node manager] got idle node');
        // get the next node
        let node = this.nodes.pop();
        if (node === null)
            throw new Error('node is null');
        // return the node
        return node;
    }
    getBusy() {
        // returned a single busy node
        return this.nodes.getDisabled().pop();
    }
    getIdleNodes() {
        /* this function return the nodes which are idle */
        return this.nodes.getEnabledObjects();
    }
    getBusyNodes() {
        /* this function return the nodes which are busy */
        return this.nodes.getDisabledObjects();
    }
    async forEach(callback) {
        let nodes = this.nodes.toArray();
        // for each node, make a promise
        let promises = nodes.map(async (node) => {
            if (node.isBusy())
                await node.toFinish();
            return callback(node);
        });
        // wait for all the promises to resolve
        return Promise.all(promises);
    }
    async registerServices(services) {
        // register the services to all the nodes
        return this.broadcast(async (node) => await node.registerServices(services));
    }
    async spawnNodes(name = '', count = 1, metadata = {}) {
        /* spawn new nodes */
        if (name === '')
            name = 'node_' + this.name;
        log('[nodeManager][spawnNodes] spawning nodes', name, count);
        this.cluster.spawn(name, {
            numberOfSpawns: count,
            metadata: metadata
        });
    }
    async killNode(nodeId = '') {
        // this function will get an idle node fom the pool
        if (this.nodes.isEmpty())
            return false;
        // get an idle node
        let node = (nodeId === '') ?
            this.nodes.removeOne() :
            this.nodes.remove(nodeId);
        if (node === null || node === undefined)
            throw new Error('Node sentenced to death could not be found');
        // and exit it
        await node.exit();
    }
    async killNodes(nodesId = []) {
        /* kill nodes */
        for (let nodeId of nodesId)
            await this.killNode(nodeId);
    }
    getIdleCount() {
        // return the number of idle nodes
        return this.nodes.getEnabledCount();
    }
    getBusyCount() {
        // return the number of busy nodes
        return this.nodes.getDisabledCount();
    }
    getNodes() {
        // get all nodes
        return this.nodes.toArray();
    }
    nextNode() {
        return this.nodes.next();
    }
    getNodeCount() {
        return this.nodes.size();
    }
    getNode(nodeId) {
        // get a node by its id
        let node = this.nodes.get(nodeId);
        if (node === null)
            throw new Error(`[node manager] (ERROR) selected node ${nodeId} not found`);
        return node;
    }
    getListeners() {
        if (this.network === undefined)
            throw new Error('network is undefined');
        return this.network.getRegisteredListeners();
    }
    async numberOfNodesConnected(count) {
        let timeout = 100000;
        await await_interval(() => this.nodes.size() >= count, timeout)
            .catch(() => { throw new Error(`timeout of ${timeout} seconds, not enough nodes connected`); });
        return true;
    }
    async exit() {
        // close all the nodes
        return this.broadcast(async (node) => await node.exit());
    }
    async broadcast(callback) {
        // get all the nodes
        let nodes = this.nodes.toArray();
        // for each node, make a promise
        let promises = nodes.map(async (node) => await callback(node));
        // wait for all the promises to resolve
        return Promise.all(promises);
    }
    setIdle = (NodeId) => this.nodes.enable(NodeId);
    setBusy = (NodeId) => this.nodes.disable(NodeId);
    /* synonims */
    addNode = this.spawnNodes;
    removeNode = this.killNodes;
    getNumberOfNodes = this.getNodeCount;
}
export default NodeManager;
//# sourceMappingURL=NodeManager.js.map