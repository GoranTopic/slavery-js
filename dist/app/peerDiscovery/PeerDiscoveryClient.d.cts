import Network from '../../network/Network.cjs';
import '../../network/Connection.cjs';
import 'socket.io';
import '../../network/types/Listener.cjs';
import '../../utils/Pool.cjs';
import '../../network/Server.cjs';
import 'http';

type params = {
    name?: string;
    host: string;
    port: number;
};
declare class PeerDiscoveryClient {
    name: string;
    host: string;
    port: number;
    network?: Network;
    windowTime: number;
    constructor({ host, port, name }: params);
    connect(): Promise<void>;
    register({ host, port, name }: params): Promise<any>;
    getServices(): Promise<any>;
    exit(): Promise<any>;
}

export { PeerDiscoveryClient as default };
