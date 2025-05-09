import Connection from './Connection.cjs';
import Pool from '../utils/Pool.cjs';
import Listener from './types/Listener.cjs';
import NetworkServer from './Server.cjs';
import 'socket.io';
import 'http';

type NetworkOptions = {
    timeout?: number;
};
type NetworkParameters = {
    name?: string;
    id?: string | undefined;
    options?: NetworkOptions;
};
declare class Network {
    id: string;
    server: NetworkServer | null;
    name: string;
    private listeners;
    connections: Pool<Connection>;
    serviceConnectionCallback?: Function;
    serviceDisconnectCallback?: Function;
    newListenersCallback?: Function;
    timeout: number;
    constructor({ name, id, options }: NetworkParameters);
    connect({ name, host, port, as }: {
        name?: string;
        host: string;
        port: number;
        as?: string;
    }): Promise<Connection>;
    connectAll(services: {
        name: string;
        host: string;
        port: number;
    }[]): Promise<never[] | Connection[]>;
    createServer(name: string, host: string, port: number, listeners?: Listener[]): void;
    close(): void;
    getService(name: string): Connection;
    getServices(): Connection[];
    getNode(id: string): Connection;
    getNodes(): Connection[];
    getConnections(): Connection[];
    closeService(name: string): void;
    closeConnection(id: string): void;
    registerListeners(listeners: Listener[]): void;
    addListeners(listeners: Listener[]): void;
    getRegisteredListeners(): any;
    onNodeConnection(callback: (connection: Connection) => void): void;
    onNodeDisconnect(callback: (connection: Connection) => void): void;
    onServiceConnection(callback: (connection: Connection) => void): void;
    onServiceDisconnect(callback: (connection: Connection) => void): void;
    onNewListeners(callback: (listeners: Listener[]) => void): void;
}

export { Network as default };
