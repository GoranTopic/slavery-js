import Node from './Node.cjs';
import ServiceAddress from '../service/types/ServiceAddress.cjs';
import Stash from '../service/Stash.cjs';
import '../network/Network.cjs';
import '../network/Connection.cjs';
import 'socket.io';
import '../network/types/Listener.cjs';
import '../utils/Pool.cjs';
import '../network/Server.cjs';
import 'http';
import './types/ServiceAddress.cjs';

type NodeManagerOptions = {
    number_of_nodes?: number;
    max_number_of_nodes?: number;
    min_number_of_node?: number;
    increase_node_at_requests?: number;
    decrease_node_at_idles?: number;
    service_address?: ServiceAddress[];
    stash?: Stash;
    timeout?: number;
};
type NodeManagerParameters = {
    name: string;
    host: string;
    port: number;
    options?: NodeManagerOptions;
};
declare class NodeManager {
    private name;
    private network;
    private nodes;
    private options;
    private cluster;
    private services;
    private stash;
    constructor({ name, host, port, options }: NodeManagerParameters);
    private handleNewNode;
    private handleNodeDisconnect;
    private handleStatusChange;
    getIdle(node_id?: string): Promise<Node>;
    getBusy(): string | undefined;
    getIdleNodes(): Node[];
    getBusyNodes(): Node[];
    forEach(callback: (node: Node) => void): Promise<void[]>;
    setServices(services: ServiceAddress[]): Promise<void>;
    spawnNodes(name?: string, count?: number, metadata?: any): Promise<void>;
    killNode(nodeId?: string): Promise<false | undefined>;
    killNodes(nodesId?: string[]): Promise<void>;
    getIdleCount(): number;
    getBusyCount(): number;
    getNodes(): Node[];
    nextNode(): Node | null;
    getNodeCount(): number;
    getNode(nodeId: string): Node;
    getListeners(): any;
    numberOfNodesConnected(count: number): Promise<boolean>;
    exit(): Promise<any[]>;
    private broadcast;
    private setIdle;
    private setBusy;
    addNode: (name?: string, count?: number, metadata?: any) => Promise<void>;
    removeNode: (nodesId?: string[]) => Promise<void>;
    getNumberOfNodes: () => number;
}

export { NodeManager as default };
