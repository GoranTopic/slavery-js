import { io } from "socket.io-client";
import { Socket } from 'socket.io';

import log from '../utils/log'

class Connection {
    /* 
     * this class is manager for the socket instance
     * it tkae either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     * 
     * it manages conenction, the listeners and the available emitters */
    private socket: Socket | any;
    public to: 'client' | 'server';
    public connected: boolean;
    public socketId: string;

    constructor(socket: Socket | { host: string, port: number }) {
        if (socket instanceof Socket) {
            this.to = 'client';
            this.socket = socket;
        } else {
            this.to = 'server';
            this.socket = io(`ws://${socket.host}:${socket.port}`);
        }
        this.connected = false
        this.initilaizeListeners()
    }

    public type(){
        return this.to;
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
        this.socket.io.on("reconnect", (attempt: number) => {
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
