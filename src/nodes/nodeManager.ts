/* this class will take a Netowrk node as input and
 * will manage the client nodes that are connected to it. 
 * this class provide an interface for other classes to interact with all the nodes
 * if a class wants to run a function on each difrent node,
 * if a class wants to broadcast a message to all the nodes
 * if a class want to get the next idle node,
 * or the number of node connected to the network
 * or the number of node that have been disconnected
 * or which are currently busy, or idle, etc
 */
import Network, { Server } from './network';
import { log, Pool } from '../utils';


class NodeManager {
  private network: Network;
  private server: Server;
  private pool: Pool<String>;

  constructor(network: Network) {
    this.network = network;
    this.pool = new Pool();
  }

  public addNode(node: any) {
    this.pool.add(node);
  }

  public removeNode(node: any) {
    this.pool.remove(node);
  }

  public getNodes() {
    return this.pool.get();
  }

  public broadcast(data: any) {
    this.pool.get().forEach((node) => {
      node.send(data);
    });
  }
}   


export default NodeManager;




