import Connection from './Connection.js';
import { uuid, log, Pool } from '../utils/index.js';
import Server from './Server.js';
class Network {
    /* *
     * this class will handle the connections of a node in the network.
     * this node can be in either a server or a client.
     * in a server it will have a Server instance and it will handle the nodes connections
     * in a client it will have a pool of connections to other servers
     * Each Node will have a NetworkNode
     * */
    id;
    // this is where a node store its server,
    // which in turn stores its connections to clients
    server;
    name;
    listeners;
    // this is where we store our connections to servers
    connections;
    // callback for when a new service connection is made
    serviceConnectionCallback;
    // callback for when a service disconnects
    serviceDisconnectCallback;
    // callback for when a new listener is added
    newListenersCallback;
    constructor({ name = '', id = undefined }) {
        //log(`[Network][${name}] netowrk created`);
        this.name = name;
        this.listeners = [];
        this.id = id || uuid();
        this.server = null;
        this.connections = new Pool();
        this.serviceConnectionCallback = undefined;
        this.serviceDisconnectCallback = undefined;
        this.newListenersCallback = undefined;
    }
    async connect({ name, host, port, as }) {
        /* this function connects to a server instance or a Node Manager
         * and it keeps track of the conenction by adding it to a pool of server connection
         * it uses the name as the key in the pool
         * then run the callback */
        const connection = new Connection({
            name: this.name, host, port, id: this.id,
            onSetListeners: this.newListenersCallback
        });
        // await connection and handshake
        await connection.connected();
        // get the name of the target service
        let server_name = connection.getTargetName();
        if (server_name === undefined)
            throw new Error('Server name is undefined');
        if (name !== undefined) // check if the name is the same
            if (server_name !== name)
                throw new Error(`Server name mismatch: ${server_name} !== ${name}`);
        // if we are saving the connection as a different name
        if (as !== undefined)
            server_name = as;
        // if we already have a connection with the same id, remove it
        if (this.connections.has(server_name)) {
            let conn = this.connections.remove(server_name);
            conn && conn.close();
        }
        // add the listeners to the new connection
        connection.setListeners(this.listeners);
        // add the new connection
        this.connections.add(server_name, connection);
        // new connection callback
        this.serviceConnectionCallback && this.serviceConnectionCallback(connection);
        // return the connection
        return connection;
    }
    async connectAll(services) {
        log(`[Network][${this.name}] connecting to all services`, services);
        // connect to all the services
        let connections = await Promise.all(services.map(async (service) => await this.connect({
            name: service.name,
            host: service.host,
            port: service.port
        }))).catch((err) => {
            log(`[Network][${this.name}] error connecting to services:`, err);
            return [];
        });
        //log(`[Network][${this.name}] returning connections:`, connections);
        return connections;
    }
    createServer(name, host, port, listeners = []) {
        // the server keeps track of it client connections
        this.server = new Server({ name, host, port, listeners });
    }
    close() {
        // if we have a server we close it
        if (this.server) {
            this.server.close();
        }
        // close all the connections
        this.connections.toArray().forEach((connection) => {
            connection.close();
        });
    }
    getService(name) {
        // get the service connection
        let service = this.connections.get(name);
        // if the service is not found we throw an error
        if (service === null)
            throw new Error(`Service ${name} not found for ${this.name}`);
        return service;
    }
    getServices() {
        // get all the clients that are services types
        return this.connections.toArray();
    }
    getNode(id) {
        // get the client that is a node type
        if (this.server === null)
            throw new Error('Server is not created');
        let client = this.server.getClient(id);
        // throw an error if the client is not found
        if (client === null)
            throw new Error('Client not found');
        // return the client
        return client;
    }
    getNodes() {
        // get all the clients that are nodes types
        let nodes = this.server?.getClients().
            filter((conn) => conn.targetType === 'client');
        return nodes || [];
    }
    getConnections() {
        // get all the connections
        return this.connections.toArray().concat(this.server?.getClients() || []);
    }
    closeService(name) {
        // close the connection
        let connection = this.connections.remove(name);
        if (connection)
            connection.close();
        // callback
        this.serviceDisconnectCallback &&
            this.serviceDisconnectCallback(connection);
    }
    closeConnection(id) {
        // close the connection
        let connection = this.connections.remove(id);
        if (connection)
            connection.close();
    }
    registerListeners(listeners) {
        /* this function registers the listeners to the network and overwrites the old ones */
        //log(`[Network][RegisterListners][${this.name}]`, listeners);
        //log(`[Network][RegisterListners][${this.name}] connections:`, this.connections);
        // store the listeners
        this.listeners = listeners;
        // if we have a server created we pass the listeners to it
        if (this.server)
            this.server.setListeners(this.listeners);
        // for every conenction in out pool we register the listeners
        this.connections.toArray().forEach((connection) => {
            connection.setListeners(listeners);
        });
    }
    addListeners(listeners) {
        /* this function adds the listeners to the network */
        this.listeners = this.listeners.concat(listeners);
        // if we have a server created we pass the listeners to it
        if (this.server)
            this.server.addListeners(listeners);
        // for every conenction in out pool we register the listeners
        this.connections.toArray().forEach((connection) => {
            connection.addListeners(listeners);
        });
    }
    getRegisteredListeners() {
        // get the listeners from the server
        let server_listeners = this.server?.getListeners() || [];
        let connections_listeners = this.connections.toArray().map((connection) => {
            log('inside loop conenction:', connection);
            return { id: connection.id, listeners: connection.getListeners() };
        });
        // return the listeners
        return { server: server_listeners, connections: connections_listeners };
    }
    /* callbacks */
    onNodeConnection(callback) {
        if (this.server === null)
            throw new Error('Server is not created');
        this.server.onConnection(callback);
    }
    onNodeDisconnect(callback) {
        if (this.server === null)
            throw new Error('Server is not created');
        this.server.onDisconnect(callback);
    }
    onServiceConnection(callback) {
        // set the network listners to the connection
        this.serviceConnectionCallback = callback;
    }
    onServiceDisconnect(callback) {
        this.serviceDisconnectCallback = callback;
    }
    onNewListeners(callback) {
        this.newListenersCallback = callback;
    }
}
export default Network;
//# sourceMappingURL=Network.js.map