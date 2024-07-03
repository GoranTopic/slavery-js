import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import { log, Pool } from '../utils';
import Listener from './types/Listener';
import Connection from "./Connection";



class NetworkServer {
    /* this class will handle the logic managing the server conenctions with clilent, 
     * it will keep track of the node id and it will handle connection and dicoections */
    private io: Server;
    private host: string;
    private port: number;
    private maxTransferSize: number;
    private clients: Pool<Connection>;
    public name: string;
    public isOverLan: boolean;
    public connectionCallback: any;
    public listeners: Listener[];
    private ioOptions: any;

    constructor({ name, host, port, listeners } : {
        name: string, host: string, port: number, listeners: Listener[]
    }, options?: { maxTransferSize: number }) {
        this.host = host || "localhost";
        this.port = port || 3000;
        this.maxTransferSize = options?.maxTransferSize || 1e9;
        this.name = name? name : "server";
        this.isOverLan = this.host !== 'localhost'
        this.connectionCallback = null;
        this.clients = new Pool();
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
        this.io.on("connection", this.handleConnection.bind(this));
        this.io.on("reconnect", () => console.log("[master] on reconnect triggered"));
        this.io.on("disconnect", this.handleDisconnection.bind(this));
        // add listeners to the server
        this.listeners.forEach((listener: Listener) => {
            // run the listener callback and emit the result to the client
            let callback = async ( ...args: any[] ) => {
                // run the listener callback
                let result = await listener.callback(...args);
                // emit the result to the client
                this.io.emit(listener.event, result);
            }
            this.io.on(listener.event, callback);
        });
    }

    private async handleConnection(socket: Socket) {
        // make a new connectection instance
        let connection = new Connection(socket);
        // await fo connection to be established
        await connection.connected();
        // get the id of the connection
        let id = connection.getTargetId();
        // check if id is null
        if(id == null) throw new Error("Connection id is null");
        // check if connection already exists
        if(this.clients.has(id)) {
            log(`[master] connection with id ${id} already exists`);
            let client = this.clients.remove(id);
            client && client.close();
        }
        // give server listeners to the connection
        await connection.setListeners(this.listeners);
        // add connection to pool
        this.clients.add(id, connection);
        // run callback
        if(this.connectionCallback)
            this.connectionCallback(connection);
    }

    private handleDisconnection(socket: Socket) {
        let socketId = socket.id
        // filter every client based on the socket id
        let conn = this.clients.toArray()
        .filter((client: Connection) => client.socketId === socketId)[0];
        // cast conn as type Connection
        if(conn) {
            // close the connection
            conn.close();
            let id = conn.getTargetId();
            if(id === undefined) 
                throw new Error("Connection id is undefined");
            this.clients.remove(conn.getTargetId() as string);
        }
    }

    public getClients() : Connection[] {
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

export default NetworkServer;
