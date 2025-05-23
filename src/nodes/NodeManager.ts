import Cluster from '../cluster/index.js';
import Network, { Connection } from '../network/index.js';
import Node from './Node.js';
import { ServiceAddress, Stash } from '../service/index.js';
import { Pool, await_interval, log } from '../utils/index.js';

/* this class is created to manage the nodes socket conenctions on a service,
 * it will handle new conenction fron node, and will remove them when they are disconnected
 * this class provide an interface for other classes to interact with all the nodes
 * if a class wants to run a function on each difrent node,
 * if a class wants to broadcast a message to all the nodes
 * if a class want to get the next idle node,
 * or the number of node connected to the network
 * or the number of node that have been disconnected
 * or which are currently busy, or idle, etc
 */

type NodeManagerOptions = {
    // the number of processes that will be started on each node
    number_of_nodes?: number,
    max_number_of_nodes?: number,
    min_number_of_node?: number,
    // the number of request that have to be in queue before increasing the number of processes
    increase_node_at_requests?: number,
    // the number of node that have to be idle before decreasing the number of processes
    decrease_node_at_idles?: number,
    // service address for nodes
    service_address?: ServiceAddress[],
    // you can pass the stash object to the node manager
    stash?: Stash,
    // timeout
    timeout?: number,
}

type NodeManagerParameters = {
    // name of the service
    name: string,
    // the host and port of the service
    host: string,
    port: number,
    options?: NodeManagerOptions,
}

class NodeManager {
    private name: string;
    private network: Network;
    //private heartBeat: number = 1000;
    private nodes: Pool<Node> = new Pool();
    private options: NodeManagerOptions;
    private cluster = new Cluster({});
    private services: ServiceAddress[] = [];
    private stash: Stash | null;


    constructor({ name, host, port, options }: NodeManagerParameters) {
        this.name = name;
        this.options = options || {};
        this.network = new Network({
            name: this.name + '_node_manager',
            options: {
                timeout: this.options.timeout || 10000,
            }
        });
        // create server
        this.network.createServer( this.name + '_node_manager', host, port);
        // handle when new node is connected
        this.network.onNodeConnection(this.handleNewNode.bind(this));
        // handle when a node is disconnected
        this.network.onNodeDisconnect(this.handleNodeDisconnect.bind(this));
        // set the stash
        this.stash = options?.stash || null;
  }

  private async handleNewNode(connection: Connection) {
      /* this function is called when a new node is connected to the master */
      // create a new node
      let node = new Node({
          mode: 'server',
          connection,
          network: this.network,
          services: this.services,
          statusChangeCallback: this.handleStatusChange.bind(this),
          stashSetFunction: async (key: string, value: any) => await this.stash?.set(key, value),
          stashGetFunction: async (key: string) => await this.stash?.get(key),
      });
      // sends the service list to the client node
      let res = await node.start();
      // get the id of the node
      let id = node.getId();
      if(id === undefined) throw new Error('node id is undefined');
      // add to the pool
      this.nodes.add(id, node);
      // add to the enabled pool
      this.setIdle(id);
  }


  private handleNodeDisconnect(connection: Connection) {
      // get the node id
      let id = connection.getId();
      if(id === undefined) throw new Error('node id is undefined');
      // remove the node from the pool
      this.nodes.remove(id);
  }

  private handleStatusChange(status: string, node: Node) {
      // if the node is idle add it to the enabled pool
      // if the node is busy add it to the disabled pool
      if(!status) throw new Error('status is undefined');
      let id = node.getId();
      if(id === undefined) throw new Error('node id is undefined');
      if(node.isIdle() || node.isError())
          this.setIdle(id);
      else if(node.isBusy())
          this.setBusy(id);
      else
          throw new Error('invalid node status');
  }

  public async getIdle(node_id: string = '') : Promise<Node> {
      /* this function return a node that is idle */
      if(node_id !== '') { // we are looking for a specific node on the pool
          let node = this.getNode(node_id);
          // await for seelcted node to be idle
          await await_interval({
              condition: () => node.isIdle(),
                timeout: this.options.timeout || 3600000, // one hour
          }).catch(() => {
              throw new Error(`timeout of one hour, node ${node_id} is not idle`);
          });
          return node;
      }
      // check if there are nodes in the pool
      if(this.nodes.isEmpty())
          log('[node manager] (WARNING) no nodes found');
      // await until we get a node which is idle
      // 0 will make it wait for every for a idle node
      await await_interval({
          condition: () => this.nodes.hasEnabled(),
            timeout: 0, // forever
      }).catch(() => { throw new Error('timeout of 10 seconds, no idle node found') });
      //log('[node manager] got idle node');
      // get the next node
      let node = this.nodes.pop();
      if(node === null) throw new Error('node is null');
      // return the node
      return node
  }

  public getBusy(){
      // returned a single busy node
      return this.nodes.getDisabled().pop();
  }

  public getIdleNodes() : Node[] {
      /* this function return the nodes which are idle */
      return this.nodes.getEnabledObjects();
  }

  public getBusyNodes() : Node[] {
      /* this function return the nodes which are busy */
      return this.nodes.getDisabledObjects();
  }

  public async forEach(callback: (node: Node) => void) {
      let nodes = this.nodes.toArray();
      // for each node, make a promise
      let promises = nodes.map(async (node: Node) => {
          try {
              if(node.isBusy()) await node.toFinish();
              return callback(node);
          } catch (error) {
              log(`[NodeManager][forEach] Error: ${error}`);
              throw error;
          }
      });
      // wait for all the promises to resolve
      return Promise.all(promises).catch(error => {
          log(`[NodeManager][forEach] Error in Promise.all: ${error}`);
          throw error;
      });
  }

  public async setServices(services: ServiceAddress[]) {
      // set the services to all the nodes
      this.services = services;
      if(this.nodes.size() > 0)
          await this.broadcast( async (node: Node) => 
              await node.setServices(services)
          );
  }

  public async spawnNodes(name: string = '', count: number = 1, metadata: any = {}) {
      /* spawn new nodes */
      if(name === '') name = 'node_' + this.name;
      this.cluster.spawn(name, {
          numberOfSpawns: count,
          metadata: metadata
      });
  }

  public async killNode(nodeId: string = '') {
      // this function will get an idle node fom the pool
      if(this.nodes.isEmpty()) return false
      // get an idle node
      let node = (nodeId === '')?
          this.nodes.removeOne() :
          this.nodes.remove(nodeId);
      if(node === null || node === undefined)
          throw new Error('Node sentenced to death could not be found');
      // and exit it
      await node.exit();
  }

  public async killNodes(nodesId: string[]=[]) {
      /* kill nodes */
      for(let nodeId of nodesId)
          await this.killNode(nodeId);
  }

  public getIdleCount(){
      // return the number of idle nodes
    return this.nodes.getEnabledCount();
  }

  public getBusyCount(){
      // return the number of busy nodes
    return this.nodes.getDisabledCount();
  }

  public getNodes() {
      // get all nodes
      return this.nodes.toArray();
  }

  public nextNode() {
      return this.nodes.next();
  }

  public getNodeCount() {
    return this.nodes.size();
  }

  public getNode(nodeId: string) {
      // get a node by its id
      let node = this.nodes.get(nodeId);
      if(node === null) throw new Error(`[node manager] (ERROR) selected node ${nodeId} not found`);
      return node;
  }

  public getListeners() {
      if(this.network === undefined) throw new Error('network is undefined');
      return this.network.getRegisteredListeners();
  }

  public async numberOfNodesConnected(count: number) {
      let timeout = this.options.timeout || 10 * 1000; // 10 seconds
      await await_interval({
        condition: () => this.nodes.size() >= count,
        timeout: timeout,
      }).catch(() => { 
          throw new Error(`timeout of ${timeout} seconds, only ${this.nodes.size()} nodes connected, expected ${count}`) 
      });
      return true;
  }


  public async exit() {
      // close all the nodes
      return this.broadcast(
          async (node: Node) => await node.exit()
      );
  }

  private async broadcast(callback: (node: Node) => any) {
      // get all the nodes
      let nodes = this.nodes.toArray();
      // for each node, make a promise
      let promises = nodes.map(
          async (node: Node) => {
              try {
                  return await callback(node);
              } catch (error) {
                  log(`[NodeManager][broadcast] Error for node ${node.getId()}: ${error}`);
                  throw error;
              }
          }
      );
      // wait for all the promises to resolve
      return Promise.all(promises).catch(error => {
          log(`[NodeManager][broadcast] Error in Promise.all: ${error}`);
          throw error;
      });
  }

  private setIdle = (NodeId: string) => this.nodes.enable(NodeId);

  private setBusy = (NodeId: string) => this.nodes.disable(NodeId);

  /* synonims */
  public addNode = this.spawnNodes
  public removeNode = this.killNodes
  public getNumberOfNodes = this.getNodeCount;

}

export default NodeManager;
