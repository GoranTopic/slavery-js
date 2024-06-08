import Network from '../../network';

class Service {
    
    private name: string;
    private clients: any[];
    private services: any[];
    private heartBeat: number;
    private network: Network;

        this.heartBeat = heartBeat ?? 100; // 100ms
        this.network = new Network();


    
}

