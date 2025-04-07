import Network from '../../network';
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
export default PeerDiscoveryClient;
