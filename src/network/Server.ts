import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import { log } from '../utils';
import Connection from "./Connection";

interface Listener {
    event: string;
    callback: Function;
}

class Server {
    /* this class will handle the logic managing the server conenctions with clilent, 
     * it will keep track of the node id and it will handle connection and dicoections */
    private io: Server;
    private host: string;
    private port: number;
    private maxTransferSize: number;
    private Clients: Pool;
    public name: string;
    public isOverLan: boolean;
    public connectionCallback: any;
    public listeners: Listener[];
    private ioOptions: any;

    constructor({ name, host, port } = {}, { maxTransferSize, listeners }? = {}) {
        this.host = host || "localhost";
        this.port = port || 3000;
        this.maxTransferSize = maxTransferSize || 1e9;
        this.name = name? name : "server";
        this.isOverLan = this.host !== 'localhost'
        this.connectionCallback = null;
        this.clients = Pool;
        this.listeners = listeners || [];
        this.ioOptions = {
            maxHttpBufferSize: this.maxTransferSize,
        };
        // initiate the server
        if(this.isOverLan){
            this.io = new Server(createServer(), this.ioOptions);
        }else{
            this.io = new Server(this.port, this.ioOptions);
        }
        // create a new socket.io client instance
        this.io.on("connection", this._handleConnection.bind(this));
        this.io.on("reconnect", () => console.log("[master] on reconnect triggered"));
    }

    private _handleConnection(socket: Socket) {
        // make a new connectection instance
        let connection = new Connection(socket);
        // add connection to pool
        this.clients.add(conection);
        // run callback
        if(this.connectionCallback)
            this.connectionCallback(connection);
    }

    getClients() {
        return this.io.sockets.sockets
    }

    onConnection(callback) {
        this.connectionCallback = callback;
    }

    getConnections() { 
        return this.connections;
    }

    async exit() {
        // broadcast exit to all slaves
        this.io.emit('_exit');
        // close all sockets
        this.io.close();
        // exit process
        process.exit();
    }

}

export default Server;
