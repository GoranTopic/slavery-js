import Server from './Server';
import Connection from './Connections';

class Network {
    private server: Server | null;
    private connections: Connection[];

    constructor() {
        this.server = null;
        this.connections = [];
    }
    
    public createServer(host: string, port: number): void {
        this.server = new Server(host, port);
    }

    public getServices(): Connection[] {
        // get all the clients that are services types
        return this.connections.filter( conn => conn.to === 'service');
    }

    public getNodes(): connections[] {
        // get all the clients that are nodes types
        return this.connections.filter((client) => client.type === 'node');
    }

    public onConnection(callback: (client: Client) => void): void {
        let client = this.server.onConnection(callback);
        this.clients.push(client);
    }


}
