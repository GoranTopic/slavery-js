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
import Network, { Connection } from '../network';
import Node from './Node';
import { log, Pool } from '../utils';


class NodeManager {
  private network: Network;
  private heartBeat: number = 1000;
  private nodes: Pool<Node> = new Pool();


  constructor() {
    this.network = new Network();
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
      this.nodes.enable(id);
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
          this.nodes.enable(id);
      else if(node.isBusy())
          this.nodes.disable(id);
      else 
          throw new Error('invalid node status');
  }

  public async getIdle(){
      /* this function return a node that is idle */
      console.log('[node manager] gettting idle node');
      // search all sockets
      return await new Promise( async (resolve) => {
          // which check all the sockets
          let interval = setInterval(() => {
              // get the slave
              let node = this.nodes.next();
              // check if slave is idle
              if(node.isIdle() || node.isError()){
                  clearInterval(interval);
                  //clearTimeout(timeout);
                  log('[node manager] idle node found');
                  //log('[master] pool queue: ', this.slaves.enabled.toArray());
                  resolve(node);
                  // adjust heart beat
                  //this._adjustHeartBeat();
              }
          }, this.heartBeat);
      }).catch( error => {
          console.error('[master] getIdle error: ', error)
      })
  }

  public async forEach(callback: (node: Node) => void) {
    let 
    // for every idle node, run the callback
    //let nodes = this.network.getClients();
    //nodes = nodes.filter((node: any) => node.isIdle());
  }

  public getBusy(){
  }

  public getIdleCount(){
  }

  public getBusyCount(){
  }

  public getNodes() {
  }

  public getNode(id: string) {
  }

  public getNodeCount() {
  }

  public setIdle(NodeId: string) {

  }

  public setBusy(NodeId: string) {
  }

  // slave jargon
  public getSlave = this.getNode;
  public getSlaves = this.getNodes;
  public getSlaveCount = this.getNodeCount;
  

}   

export default NodeManager;




