import Network from '../../network/index.js';
import { log } from '../../utils/index.js';

type params = {
    name?: string,
    host: string,
    port: number,
}


class PeerDiscoveryClient {
    /* this class will be used to connect to a the peer discovery server */
    public name: string = 'peer_discovery';
    public host: string;
    public port: number;
    public network?: Network = new Network({ name: 'peer_discovery' });
    // the time we give every service to register, before we get the services
    public windowTime = 2000; // 2 seconds
    // get the network from the connection
    constructor({ host, port, name }: params) {
        this.name = name || 'peer_discovery';
        this.host = host;
        this.port = port;
    }

    public async connect(){
        // connect to server
        if(this.network === undefined) throw new Error('Network not set');
        await this.network.connect({
            name: this.name,
            host: this.host,
            port: this.port,
        });
    }

    public async register({ host, port, name }: params) {
        if(this.network === undefined) throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if(connection === null) throw new Error(`Service ${this.name} not found`);
        return await connection.send('register_service', { host, port, name });
    }

    public async getServices() {
        // await for the window time
        await new Promise((resolve) => setTimeout(resolve, this.windowTime));
        if(this.network === undefined) throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if(connection === null) throw new Error(`Service ${this.name} not found`);
        let services = await connection.send('get_services');
        return services;
    }

    public async exit() {
        if(this.network === undefined) throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if(connection === null) throw new Error(`Service ${this.name} not found`);
        return await connection.send('exit');
    }

}

export default PeerDiscoveryClient;
