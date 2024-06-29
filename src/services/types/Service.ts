import Network from '../../network';

class Service {
    
    private name: string;
    private heartBeat: number;
    private network: Network;

    constructor(name: string, { heartBeat }: { heartBeat?: number } = {}) {
        this.name = name;
        this.heartBeat = heartBeat ?? 100; // 100ms
        this.network = new Network();
        // create service? 
        // but we dont have the host or port yet
    }
}

export default Service;
