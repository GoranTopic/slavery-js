type Parameters = {
    host: string;
    port: number;
};
declare class PeerDicoveryServer {
    name: string;
    host: string;
    port: number;
    private cluster;
    private network;
    private services;
    constructor(params: Parameters);
    start(): Promise<void>;
    private getListeners;
    private registerService;
    private getServices;
    private removeService;
    exit(): boolean;
}

export { PeerDicoveryServer as default };
