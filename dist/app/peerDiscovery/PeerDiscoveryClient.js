"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = __importDefault(require("../../network/index.js"));
class PeerDiscoveryClient {
    /* this class will be used to connect to a the peer discovery server */
    name = 'peer_discovery';
    host;
    port;
    network = new index_js_1.default({ name: 'peer_discovery' });
    // the time we give every service to register, before we get the services
    windowTime = 2000; // 2 seconds
    // get the network from the connection
    constructor({ host, port, name }) {
        this.name = name || 'peer_discovery';
        this.host = host;
        this.port = port;
    }
    async connect() {
        // connect to server
        if (this.network === undefined)
            throw new Error('Network not set');
        await this.network.connect({
            name: this.name,
            host: this.host,
            port: this.port,
        });
    }
    async register({ host, port, name }) {
        if (this.network === undefined)
            throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if (connection === null)
            throw new Error(`Service ${this.name} not found`);
        return await connection.send('register_service', { host, port, name });
    }
    async getServices() {
        // await for the window time
        await new Promise((resolve) => setTimeout(resolve, this.windowTime));
        if (this.network === undefined)
            throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if (connection === null)
            throw new Error(`Service ${this.name} not found`);
        let services = await connection.send('get_services');
        return services;
    }
    async exit() {
        if (this.network === undefined)
            throw new Error('Network not set');
        let connection = this.network.getService(this.name);
        if (connection === null)
            throw new Error(`Service ${this.name} not found`);
        return await connection.send('exit');
    }
}
exports.default = PeerDiscoveryClient;
//# sourceMappingURL=PeerDiscoveryClient.js.map