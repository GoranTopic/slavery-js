import { Server } from "socket.io";
import { createServer } from "http";
import { log, Pool } from '../utils';
import Connection from "./Connection";
class NetworkServer {
    /* this class will handle the logic managing the server conenctions with clilent,
     * it will keep track of the node id and it will handle connection and dicoections */
    io;
    host;
    port;
    maxTransferSize;
    clients;
    name;
    isLan;
    connectionCallback;
    disconnectCallback;
    listeners;
    httpServer;
    isReady;
    ioOptions;
    constructor({ name, host, port, listeners }, options) {
        this.host = host || "localhost";
        this.isLan = this.host !== 'localhost';
        this.port = port || 0; // zero means random port
        this.isReady = false;
        this.maxTransferSize = options?.maxTransferSize || 1e9; // default 1GB
        this.name = name ? name : "server";
        this.connectionCallback = null;
        this.disconnectCallback = null;
        this.clients = new Pool();
        this.listeners = listeners || [];
        this.ioOptions = {
            maxHttpBufferSize: this.maxTransferSize,
        };
        // initiate with the server
        if (this.isLan) { // if we are in a over lan
            // create a http server
            this.httpServer = createServer();
            this.io = new Server(this.httpServer, this.ioOptions);
            this.httpServer.listen(this.port, this.host, () => {
                let address = this.httpServer?.address();
                if (!address || typeof address === "string") {
                    console.error("Server is not running");
                    return;
                }
                this.isReady = true;
                this.port = address.port;
            });
        }
        else { // if we are in localhost
            this.io = new Server(this.port, this.ioOptions);
            // get the port number
            this.port = this.io.httpServer.address().port;
        }
        // create a new socket.io client instance
        this.io.on("connection", this.handleConnection.bind(this));
        this.io.on("reconnect", () => log("[Server] on reconnect triggered"));
        this.io.on("disconnect", this.handleDisconnection.bind(this));
        // set the listener on the server socket
        this.setListeners(this.listeners);
    }
    async handleConnection(socket) {
        log("[Server] got new connection");
        // make a new connectection instance
        let connection = new Connection({
            socket, name: this.name, listeners: this.listeners
        });
        // await fo connection to be established
        await connection.connected();
        // get the id of the connection
        let id = connection.getTargetId();
        log("[Server] connection id: ", id);
        // check if id is null
        if (id == null)
            throw new Error("Connection id is null");
        // check if connection already exists
        if (this.clients.has(id)) {
            let client = this.clients.remove(id);
            client && client.close();
        }
        // give server listeners to the connection
        // await connection.setListeners(this.listeners);
        // add connection to pool
        this.clients.add(id, connection);
        // run callback
        if (this.connectionCallback)
            this.connectionCallback(connection);
    }
    handleDisconnection(socket) {
        console.log('[Server] got disconnection from node');
        let socketId = socket.id;
        console.log('[Server] socket id: ', socketId);
        // filter every client based on the socket id
        let conn = this.clients.toArray()
            .filter((client) => client.socketId === socketId)[0];
        // cast conn as type Connection
        if (conn) {
            // close the connection
            conn.close();
            let id = conn.getTargetId();
            if (id === undefined)
                throw new Error("Connection id is undefined");
            this.clients.remove(conn.getTargetId());
            // run the disconnect callback
            if (this.disconnectCallback)
                this.disconnectCallback(conn);
        }
    }
    setListeners(listeners) {
        // set the listeners on the server socket
        listeners.forEach((listener) => {
            // run the listener callback and emit the result to the client
            let callback = async (...args) => {
                // run the listener callback
                let result = await listener.callback(...args);
                // emit the result to the client
                this.io.emit(listener.event, result);
            };
            // remove any previous listeners
            this.io.removeAllListeners(listener.event);
            // set the new listener
            this.io.on(listener.event, callback);
        });
        // store the listeners
        this.listeners = listeners;
        // broadcast the new listeners to all clients
        this.io.emit('_set_listeners', this.listeners);
    }
    broadcast(event, data) {
        // broadcast an event to all clients
        this.io.emit(event, data);
    }
    addListeners(listeners) {
        // add a new listener to the server
        // if we have the same event name, we will overwrite it
        const eventMap = new Map(this.listeners.map(l => [l.event, l]));
        listeners.forEach(l => eventMap.set(l.event, l));
        listeners = Array.from(eventMap.values());
        // set the listener on the server socket
        this.setListeners(this.listeners);
    }
    getClient(id) {
        return this.clients.get(id);
    }
    getClients() {
        return this.clients.toArray();
    }
    onConnection(callback) {
        this.connectionCallback = callback;
    }
    onDisconnect(callback) {
        this.disconnectCallback = callback;
    }
    getListeners() {
        // the the listneres from the first client
        let client = this.clients.toArray()[0];
        // if client is null return an empty array
        if (!client)
            return [];
        // return the listeners
        return client.getListeners();
    }
    async close() {
        // close all sockets
        this.io.close();
    }
}
export default NetworkServer;
//# sourceMappingURL=Server.js.map