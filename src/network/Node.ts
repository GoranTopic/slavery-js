import Connection from './Connection';
import { uuid, log, Pool } from '../utils';
import Listener from './types/Listener';
import Server from './Server';

class NetworkNode {
    public id: string;
    // this is where a node store its server, which in turn stores its connections to clients
    public server: Server | null;
    // this is where we store our connections to servers
    public connections: Pool<Connection>;
    // callback for when a new service connection is made
    public serviceConnectionCallback: ((connection: Connection) => {}) | null;
    // callback for when a service disconnects
    public serviceDisconnectCallback: ((connection: Connection) => {}) | null;

    constructor() {
        this.id = uuid();
        this.server = null;
        this.connections = new Pool();
        this.serviceConnectionCallback = null;
        this.serviceDisconnectCallback = null;
    }

    async connect(host: string, port: number) {
        /* this function connects to a server instance */
        const connection = new Connection({ host, port, id: this.id }); 
        // await connection and handshake
        await connection.connected();
        let server_name = connection.getTargetName();
        if(server_name === undefined) 
            throw new Error('Server name is undefined');
        // if we already have a connection with the same id, remove it
        if(this.connections.has(server_name)) {
            let conn = this.connections.remove(server_name);
            conn && conn.close();
        }
        // add the new connection
        this.connections.add(server_name, connection);
        // new connection callback
        this.serviceConnectionCallback && this.serviceConnectionCallback(connection);   
    }
    
    public createServer(
        name: string, host: string, port: number,
        listeners: Listener[]
    ) {
        // the server keeps track of it client connections
        this.server = new Server({ name, host, port, listeners });
    }

    public closeServer() {
        this.server?.exit();
    }

    public getServices(): Connection[] {
        // get all the clients that are services types
        return this.connections.toArray();
    }

    public getNodes(): Connection[] {
        // get all the clients that are nodes types
        let nodes = this.server?.getClients().
            filter((conn: Connection) => conn.targetType === 'client');
        return nodes || [];
    }

    /* callbacks */
    public onNodeConnection(callback: (connection: Connection) => {}): void {
        if(this.server === null) throw new Error('Server is not created');
        this.server.onConnection(callback);
    }

    public onNodeDisconnect(callback: (connection: Connection) => {}): void {
        if(this.server === null) throw new Error('Server is not created');
        this.server.onDisconnect(callback);
    }

    public onServiceConnection(callback: (connection: Connection) => {}): void {
        this.serviceConnectionCallback = callback;
    }

    public onServiceDisconnect(callback: (connection: Connection) => {}): void {
        this.serviceDisconnectCallback = callback;
    }

}

export default NetworkNode;
