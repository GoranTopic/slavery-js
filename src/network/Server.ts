import { Server } from "socket.io";
import http from "http";
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
    public isLan: boolean;
    public connectionCallback: any;
    public disconnectCallback: any;
    public listeners: Listener[];
    public httpServer?: http.Server;
    public isReady: boolean;
    private ioOptions: any;

    constructor({ name, host, port, listeners } : {
        name: string, host: string, port: number, listeners: Listener[]
    }, options?: { maxTransferSize: number }) {
        this.host = host || "localhost";
        this.isLan = this.host !== 'localhost'
        this.port = port || 0; // zero means random port
        this.isReady = false;
        this.maxTransferSize = options?.maxTransferSize || 1e9; // default 1GB
        this.name = name? name : "server";
        this.connectionCallback = null;
        this.disconnectCallback = null;
        this.clients = new Pool<Connection>();
        this.listeners = listeners || [];
        this.ioOptions = {
            maxHttpBufferSize: this.maxTransferSize,
        };
        // initiate with the server
        if(this.isLan){ // if we are in a over lan
            // create a http server
            this.httpServer = createServer();
            this.io = new Server(this.httpServer, this.ioOptions);
            this.httpServer.listen(this.port, this.host, () => {
                let address = this.httpServer?.address();
                if(!address || typeof address === "string") {
                    console.log("Server is not running");
                    return;
                }
                this.isReady = true;
                this.port = address.port
                log(`server ${name} is running on ${host}:${port}`);
            });
        }else{ // if we are in localhost
            this.io = new Server(this.port, this.ioOptions);
            // get the port number
            this.port = (this.io as any).httpServer.address().port;
            log(`server ${name} is running on ${host}:${this.port}`);
        }
        // create a new socket.io client instance
        this.io.on("connection", this.handleConnection.bind(this));
        this.io.on("reconnect", () => console.log("[master] on reconnect triggered"));
        this.io.on("disconnect", this.handleDisconnection.bind(this));
        // set the listener on the server socket
        this.setListeners(this.listeners);
    }

    private async handleConnection(socket: Socket) {
        // make a new connectection instance
        let connection = new Connection({ socket, name: this.name });
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
            // run the disconnect callback
            if(this.disconnectCallback) 
                this.disconnectCallback(conn);
        }
    }

    private setListeners(listeners: Listener[]) {
        // set the listeners on the server socket
        listeners.forEach((listener: Listener) => {
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

    public addListeners(listeners: Listener[]) {
        // add a new listener to the server
        // if we have the same event name, we will overwrite it
        const eventMap = new Map(this.listeners.map(l => [l.event, l]));
        listeners.forEach(l => eventMap.set(l.event, l));
        this.listeners = Array.from(eventMap.values());
        // set the listener on the server socket
        this.setListeners(this.listeners);
        // broadcast the new listeners to all clients
        this.io.emit('_set_listeners', this.listeners);
    }

    public getClient(id: string) : Connection | undefined {
        return this.clients.get(id);
    }

    public getClients() : Connection[] {
        return this.clients.toArray();
    }

    public onConnection(callback: any) {
        this.connectionCallback = callback;
    }

    public onDisconnect(callback: any) {
        this.disconnectCallback = callback;
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
