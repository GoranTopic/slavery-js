import Server from './Server';
import Client from './Client';
import P

class Network {
    private server: Server | null;
    private clients: Client[];

    constructor() {
        this.server = null;
        this.clients = [];
    }
    
    public createServer(host: string, port: number, type): void {
        this.server = new Server(host, port);
    }

    public getServices(): clients[] {
        // get all the clients that are services types
        return this.clients.filter((client) => client.type === 'service');
    }

    public getNodes(): clients[] {
        // get all the clients that are nodes types
        return this.clients.filter((client) => client.type === 'node');
    }

    public onConnection(callback: (client: Client) => void): void {
        let client = this.server.onConnection(callback);
        this.clients.push(client);
    }


}
