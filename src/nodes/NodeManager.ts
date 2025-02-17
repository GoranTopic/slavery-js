import Cluster from '../cluster';
import Network, { Connection } from '../network';
import Node from './Node';
import { ServiceAddress } from '../service';
import { Pool, await_interval } from '../utils';

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

type Options = {
    // name of the service
    name: string,
    // the host and port of the service
    host: string,
    port: number,
    // the number of processes that will be started on each node
    number_of_nodes?: number,
    max_number_of_nodes?: number,
    min_number_of_node?: number,
    // the number of request that have to be in queue before increasing the number of processes
    increase_node_at_requests?: number,
    // the number of node that have to be idle before decreasing the number of processes
    decrease_node_at_idles?: number,
}

class NodeManager {
    private name: string;
    private network: Network;
    //private heartBeat: number = 1000;
    private nodes: Pool<Node> = new Pool();
    private options: Options;
    private cluster = new Cluster({});


    constructor(options: Options) {
        this.name = options.name;
        this.options = options;
        this.network = new Network();
        // create server
        this.network.createServer(
            this.name + '_node_manager',
            this.options.host,
            this.options.port
        );
        // handle when new node is connected
        this.network.onNodeConnection(this.handleNewNode.bind(this));
        // handle when a node is disconnected
        this.network.onNodeDisconnect(this.handleNodeDisconnect.bind(this));

  }

  private handleNewNode(connection: Connection) {
      /* this function is called when a new node is connected to the master */
      // create a new node
      let node = new Node();
      // set the connection to the node
      node.setNodeConnection(connection, this.network);
      // add callback on status change
      node.setStatusChangeCallback(this.handleStatusChange.bind(this));
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

  public async getIdle() : Promise<Node> {
      /* this function return a node that is idle */
      console.log('[node manager] gettting idle node');
      // check if there are nodes in the pool
      if(this.nodes.isEmpty()) console.warn('no nodes in the pool');
      // await until we get a node which is idle
      // 0 so we dont timeout
      await await_interval(() => this.nodes.hasEnabled(), 0)
      .catch(() => { throw new Error('timeout of 10 seconds, no idle node found') });
      // get the next node
      let node = this.nodes.next();
      if(node === null) throw new Error('node is null');
      // return the node
      return node
  }

  public getBusy(){
      // returned the diabled nodes
      return this.nodes.getDisabled();
  }

  public async forEach(callback: (node: Node) => void) {
      let nodes = this.nodes.toArray();
      // for each node, make a promise
      let promises = nodes.map(async (node: Node) => {
          if(node.isBusy()) await node.toFinish();
          return callback(node);
      });
      // wait for all the promises to resolve
      return Promise.all(promises);
  }

  public async registerServices(services: ServiceAddress[]) {
      // register the services to all the nodes
      return this.broadcast(
          async (node: Node) => await node.registerServices(services)
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

  public async killNodes({count}: {count: number}) {
      /* kill the nodes */
  }

  public getIdleCountruet(){
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

  public getNodeCount() {
    return this.nodes.size();
  }


  public async increaseNodes() {
      //TODO: implement this function
  }

  public async decreaseNodes() {
      //TODO: implement this function
  }

  public async exit() {
      // close all the nodes
      return this.broadcast(
          async (node: Node) =>
          await node.exit()
      );
  }

  private async broadcast(callback: (node: Node) => any) {
      // get all the nodes
      let nodes = this.nodes.toArray();
      // for each node, make a promise
      let promises = nodes.map(async (node: Node) =>
            await callback(node)
      );
      // wait for all the promises to resolve
      return Promise.all(promises);
  }

  private setIdle = (NodeId: string) => this.nodes.enable(NodeId);

  private setBusy = (NodeId: string) => this.nodes.disable(NodeId);


}

export default NodeManager;




