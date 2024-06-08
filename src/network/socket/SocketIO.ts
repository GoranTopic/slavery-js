import { io } from "socket.io-client";
import { Server } from "socket.io";


class Socket {

    private socket: any;

    constructor() {
        this.socket = io('http://localhost:3000');
    }

    public on(event: string, callback: Function): void {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any): void {
        this.socket.emit(event, data);
    }
}
