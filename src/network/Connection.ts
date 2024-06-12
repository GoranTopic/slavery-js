import io from 'socket.io-client';
import log from '../utils/log.js';

class Connection {
    /* 
     * this class is manager for the socket instance
     * it tkae either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     * 
     * it manages conenction, the listeners and the available emitters */
    private socket: io.Socket;
    private to: 'client' | 'server';
    private isConnected: boolean;
    private isOverLan: boolean;
    private connectionId: string;

    constructor(socket: io.Socket | { host: string, port: number }) {
        if (socket instanceof io.Socket) {
            this.to = 'client';
            this.socket = socket;
        } else {
            this.to = 'server';
            this.socket = io.connect(`ws://${socket.host}:${socket.port}`);
        }
        this.isConnected = false;
    }

    public connect(): void {
        this.socket.connect();
        this.isConnected = true;
    }

    public setListener(event: string, callback: Function): void {
        this.socket.on(event, callback);
    }

    public on(event: string, callback: Function): void {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any): void {
        this.socket.emit(event, data);
    }

    initilaizeListeners(): void {
        this.socket.on("connect", () => {
            log(`[connection][${this.socket.id}] is connected`)
            this.connected = true;
        });
        // if it disconnects
        this.socket.io.on("reconnect", (attempt) => {
            log(`[connection][${this.socket.id}] is reconnected, attempt: ${attempt}`)
            this.connected = true;
        });
        // if it disconnects
        this.socket.io.on("diconnect", () => {
            log(`[connection][${this.socket.id}] is disconnected`)
            this.connected = false;
        });
    }

}

export default Connection;
