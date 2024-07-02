import Network from '../../network';
import net from 'net';


type paramter = {
    name: string,
    host?: string,
    port?: number
    heartBeat?: number,

};

class Service {
    private name: string;
    private heartBeat: number = 100;
    private host?: string;
    private port?: number;
    private network: Network;

    constructor(options: paramter) {
        this.name = options.name;
        this.heartBeat = options.heartBeat ?? 100; // 100ms
        this.network = new Network();
        // create service? 
        // but we dont have the host or port yet
    }


}


export default Service;
