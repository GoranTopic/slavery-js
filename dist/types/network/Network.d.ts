import Connection from './Connection';
import { Pool } from '../utils';
import type Listener from './types/Listener';
import Server from './Server';
declare class Network {
    id: string;
    server: Server | null;
    name: string;
    private listeners;
    connections: Pool<Connection>;
    serviceConnectionCallback?: Function;
    serviceDisconnectCallback?: Function;
    newListenersCallback?: Function;
    constructor({ name, id }: {
        name?: string;
        id?: string;
    });
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
export default Network;
