import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import { log, Pool } from '../utils';
import Connection from "./Connection";

interface Listener {
    event: string;
    callback: Function;
}

class NetworkServer {
    /* this class will handle the logic managing the server conenctions with clilent, 
     * it will keep track of the node id and it will handle connection and dicoections */
    private io: Server;
    private host: string;
    private port: number;
    private maxTransferSize: number;
    private clients: Pool;
    public name: string;
    public isOverLan: boolean;
    public connectionCallback: any;
    public listeners: Listener[];
    private ioOptions: any;

    constructor({ name, host, port } : {
        name: string, host: string, port: number
    }, options?: { maxTransferSize: number, listeners: Listener[] }) {
        this.host = host || "localhost";
        this.port = port || 3000;
        this.maxTransferSize = options?.maxTransferSize || 1e9;
        this.name = name? name : "server";
        this.isOverLan = this.host !== 'localhost'
        this.connectionCallback = null;
        this.clients = new Pool();
        this.listeners = options?.listeners || [];
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
        let id = connection.id;
        if(null == id) throw new Error("Connection id is null");
        if(this.clients.has(id)) {
            log(`[master] connection with id ${id} already exists`);
            this.clients.remove(id).close();
        }
        // add connection to pool
        this.clients.add(id, connection);
        // set up listerners
        // run callback
        if(this.connectionCallback)
            this.connectionCallback(connection);
    }

    private setupListeners(socket: Socket) {
        socket.on("listeners", () => {
            this.listeners.forEach(({ event, callback }) => {
                this.io.on(event, callback);
            });
        })
    }

    private handleDisconnection(socket: Socket) {
        let connection = this.clients.get(socket.id);
        if(connection) {
            connection.close();
            this.clients.remove(socket.id);
        }
    }

    public getClients() {
        return this.clients.toArray();
    }

    onConnection(callback: any) {
        this.connectionCallback = callback;
    }

    onDisconnect(callback: any) {
        this.io.on("disconnect", callback);
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
