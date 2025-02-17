import Connection from './Connection';
import { uuid, log, Pool } from '../utils';
import Listener from './types/Listener';
import Server from './Server';

class NetworkNode {
    /* this class will handle the connections of a node in the network. 
     * this node can be in eighter a server or a client.
     * Each Node will have a NetworkNode 
     */
    public id: string;
    // this is where a node store its server, 
    // which in turn stores its connections to clients
    public server: Server | null;
    // this is where we store our connections to servers
    public connections: Pool<Connection>;
    // callback for when a new service connection is made
    public serviceConnectionCallback: Function | null;
    // callback for when a service disconnects
    public serviceDisconnectCallback: Function | null;

    constructor() {
        this.id = uuid();
        this.server = null;
        this.connections = new Pool();
        this.serviceConnectionCallback = null;
        this.serviceDisconnectCallback = null;
    }

    async connect({ name, host, port } : { name?: string, host: string, port: number }): Promise<Connection> {
        /* this function connects to a server instance 
         * and it keeps track of the conenction by adding it to a pool of server connection 
         * it uses the name as the key in the pool
         * then run the callback */
        const connection = new Connection({ host, port, id: this.id }); 
        // await connection and handshake
        await connection.connected();
        // get the name of the target service
        let server_name = connection.getTargetName();
        if(server_name === undefined) 
            throw new Error('Server name is undefined');
        if(name !== undefined) // check if the name is the same
            if(server_name !== name) 
                throw new Error(`Server name mismatch: ${server_name} !== ${name}`);
        // if we already have a connection with the same id, remove it
        if(this.connections.has(server_name)) {
            let conn = this.connections.remove(server_name);
            conn && conn.close();
        }
        // add the new connection
        this.connections.add(server_name, connection);
        // new connection callback
        this.serviceConnectionCallback && this.serviceConnectionCallback(connection);
        // return the connection
        return connection;
    }

    public async connectAll(services: { name: string, host: string, port: number }[]) {
        // connect to all the services
        let connections = await Promise.all(services.map(
            async (service) => await this.connect({ 
                name: service.name,
                host: service.host,
                port: service.port
            })
        ));
        return connections;
    }
    
    public createServer(
        name: string, host: string, port: number,
        listeners: Listener[] = []
    ) {
        // the server keeps track of it client connections
        this.server = new Server({ name, host, port, listeners });
    }

    public closeServer() {
        this.server?.exit();
    }

    public getService(name: string): Connection {
        // get the service connection
        let service = this.connections.get(name);
        // throw an error if the service is not found
        if(service === undefined) throw new Error('Service not found');
        // return the service
        return service;
    }

    public getServices(): Connection[] {
        // get all the clients that are services types
        return this.connections.toArray();
    }

    public getNode(id: string): Connection {
        // get the client that is a node type
        let client = this.server?.getClient(id);
        // throw an error if the client is not found
        if(client === undefined) throw new Error('Client not found');
        // return the client
        return client;
    }

    public getNodes(): Connection[] {
        // get all the clients that are nodes types
        let nodes = this.server?.getClients().
            filter((conn: Connection) => conn.targetType === 'client');
        return nodes || [];
    }

    public getConnections(): Connection[] {
        // get all the connections
        return this.connections.toArray().concat(this.server?.getClients() || []);
    }

    public getConnectionsByTag(tag: string): Connection[] {
        // get the connections by tag
        let nodes = this.getNodes().filter((conn: Connection) => conn.tag === tag);
        let connections = this.getConnections().filter((conn: Connection) => conn.tag === tag);
        // return both nodes and connections
        return nodes.concat(connections);
    }


    public closeService(name: string) {
        // close the connection
        let connection = this.connections.remove(name);
        if(connection) connection.close();
        // callback
        this.serviceDisconnectCallback &&
            this.serviceDisconnectCallback(connection);
    }

    public closeConnection(id: string) {
        // close the connection
        let connection = this.connections.remove(id);
        if(connection) connection.close();
    }

    public registerListeners(listeners: Listener[]) {
        // if we have a server created we pass the listeners to it
        if(this.server) {
            this.server.addListeners(listeners);
        }
        // for every conenction in out pool we register the listeners
        this.connections.toArray().forEach((connection: Connection) => {
            connection.setListeners(listeners);
        });
    }


    /* callbacks */
    public onNodeConnection(callback: (connection: Connection) => void) {
        if(this.server === null) throw new Error('Server is not created');
        this.server.onConnection(callback);
    }

    public onNodeDisconnect(callback: (connection: Connection) => void) {
        if(this.server === null) throw new Error('Server is not created');
        this.server.onDisconnect(callback);
    }

    public onServiceConnection(callback: (connection: Connection) => void) {
        this.serviceConnectionCallback = callback;
    }

    public onServiceDisconnect(callback: (connection: Connection) => void) {
        this.serviceDisconnectCallback = callback;
    }

}

export default NetworkNode;
