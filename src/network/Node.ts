import Connection from './Connection';
import { uuid, log, Pool } from '../utils';
import Server from './Server';

class NetworkNode {
    public id: string;
    // this is where a node store its server, which in turn stores its connections to clients
    public server: Server | null;
    // this is where we store our connections to servers
    public connections: Pool<Connection>;
    // callback for when a new service connection is made
    public serviceConnectionCallback: ((connection: Connection) => {}) | null;

    constructor() {
        this.id = uuid();
        this.server = null;
        this.connections = new Pool();
        this.serviceConnectionCallback = null;
    }

    async connectToServer(host: string, port: number) {
        const connection = new Connection( { host, port, id: this.id }); 
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

    
    public createService(
        name: string, host: string,
        port: number, functions: { [key: string]: Function }
    ) {
        // this function just creates a server,
        // convert the function to listeners
        let listeners = Object.keys(functions)
            .map(name => ({ event: name, callback: functions[name] }));
        // the server keeps track of it client connections
        this.server = new Server({ name, host, port, listeners });
    }

    public getServices(): Connection[] {
        // get all the clients that are services types
        return this.connections.toArray();
    }

    public getNodes(): Connection[] {
        // get all the clients that are nodes types
        let nodes = this.server?.getClients().filter((conn: Connection) => conn.targetType === 'client');
        return nodes || [];
    }

    public onNodeConnection(callback: (connection: Connection) => {}): void {
        if(this.server === null) throw new Error('Server is not created');
        this.server.onConnection(callback);
    }

    public onServiceConnection(callback: (connection: Connection) => {}): void {
        this.serviceConnectionCallback = callback;
    }

}

export default NetworkNode;
