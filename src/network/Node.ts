import Connection from './Connection';
import { uuid, log, Pool } from '../utils';
import Server from './Server';

class NetworkNode {
    public id: string;
    // this is where a node store its server, which in turn stores its connections to clients
    public server: Server | null;
    // this is where we store our connections to servers
    public connections: Pool;

    constructor() {
        this.id = uuid();
        this.server = null;
        this.connections = new Pool();
    }

    async connectToServer(host: string, port: number) {
        const connection = new Connection( { host, port, id: this.id }); 
        // await connection and handshake
        await connection.connect();
        let conn_id = connection.getId();
        // if we already have a connection with the same id, remove it
        if(this.connections.has(conn_id)) {
            let conn = this.connections.remove(conn_id);
            conn.close();
        }
        // add the new connection
        this.connections.add(conn_id, connection);
    }

    
    public createServer(name: string, host: string, port: number): void {
        this.server = new Server({ name, host, port });
    }

    public getServices(): Connection[] {
        // get all the clients that are services types
        return this.connections.toArray().filter((conn: Connection) => conn.targetType === 'server');
    }

    public getNodes(): Connection[] {
        // get all the clients that are nodes types
        return this.server?.getClients().filter((conn: Connection) => conn.targetType === 'client');
    }

    public onNodeConnection(callback: (connection: Connection) => void): void {
        this.server.onConnection(callback);
    }

    public onServiceConnection(callback: (connection: Connection) => void): void {
        this.server.onConnection(callback);
    }

}

export NetworkNode;
