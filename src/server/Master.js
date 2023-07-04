import { Server } from "socket.io";
import Slave from "./Slave.js";

class Master {
    /* Master class that will communicate with the slaves */
    constructor(options={}) {
        let { port } = options;
        this.port = port || 3003;
        // create a new socket.io server instance
        this.io = null;
        // create a new socket.io client instance
        this.slaves = [];
        // initilize
        this.init();
    }

    init() {
        // create a new socket.io server instance
        this.io = new Server(this.port);
        // create a new socket.io client instance
        this.io.on("connection", socket => {
            // add to salve to list of slaves
            this.slaves.push( new Slave(socket) );
        });
    }

    async untilConnected(number=1) {
        return new Promise((resolve, reject) => {
            let interval, timeout;
            // set interval to check for connection
            interval = setInterval(() => {
                if(this.slaves.length >= number) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve();
                }
            }, 1000); // 1 second
            // set timeout to reject if no connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject('timeout');
            }
            , 1000 * 60 ); // 1 minute
        });
    }

    async run(callback) {
        await callback(this);
    }

    async untilNewConnection() {
        return new Promise((resolve, reject) => {
            let number = this.slaves.length;
            let interval, timeout;
            // set interval to check for new connection
            interval = setInterval(() => {
                if(this.slaves.length >= number) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve();
                }
            }, 1000); // 1 minute
            // set timeout to reject if no new connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject('timeout');
            }, 1000 * 1 ); // 1 minute
        });
    }

    //  pass on function to the socket.io server
    on(event, callback) {
        this.io.on(event, callback);
    }
    emit(event, data) {
        this.io.emit(event, data);
    }

    async getSlaves() {
        // get all sockets
        this.sockets = await this.io.fetchSockets();
        // make into slave objects
        this.sockets = this.sockets.map( s => new Slave(s) );
        // return
        return this.sockets;
    }

    async getIdel() {
        return new Promise((resolve, reject) => {
            this.slaves.forEach( slave => {
                if(slave.isIdel()) {
                    resolve(slave);
                }
            });
        });
    }

}

export default Master;
