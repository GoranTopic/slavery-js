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
import Network, { Server } from './network';
import Node from './Node';
import { log, Pool } from '../utils';


class NodeManager {
  private network: Network;

  constructor(network: Network) {
    this.network = network;
  }

  private handleNewNode(conn: Connection) {
    let node = new Node(conn);
    this.network.addClient(node);
  }

  public forEach(callback: (node: any) => void) {
    // for every idle 
    let nodes = this.network.getClients();
    nodes = nodes.filter((node: any) => node.isIdle());

  }

  public getIdle(){
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

  // slave jargon
  public getSlave = this.getNode;
  public getSlaves = this.getNodes;
  public getSlaveCount = this.getNodeCount;
  

}   

export default NodeManager;




