import http from 'http';
import Listener from './types/Listener.js';
import Connection from './Connection.js';
import 'socket.io';

declare class NetworkServer {
    private io;
    private host;
    private port;
    private maxTransferSize;
    private clients;
    name: string;
    isLan: boolean;
    connectionCallback: any;
    disconnectCallback: any;
    listeners: Listener[];
    httpServer?: http.Server;
    isReady: boolean;
    timeout: number;
    private ioOptions;
    constructor({ name, host, port, listeners }: {
        name: string;
        host: string;
        port: number;
        listeners: Listener[];
    }, options?: {
        timeout: number;
        maxTransferSize: number;
    });
    private handleConnection;
    private handleDisconnection;
    setListeners(listeners: Listener[]): void;
    broadcast(event: string, data: any): void;
    addListeners(listeners: Listener[]): void;
    getClient(id: string): Connection | null;
    getClients(): Connection[];
    onConnection(callback: any): void;
    onDisconnect(callback: any): void;
    getListeners(): any[];
    close(): Promise<void>;
}

export { NetworkServer as default };
