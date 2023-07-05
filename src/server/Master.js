import { Server } from "socket.io";
import Slave from "./Slave.js";
import Queue from "./Queue.js";

class Master {
    /* Master class that will communicate with the slaves */
    constructor(options={}) {
        let { port } = options;
        this.port = port || 3003;
        // create a new socket.io server instance
        this.io = null;
        // create a new socket.io client instance
        this.slaves = new Queue();
        // initilize
        this.init();
    }

    init() {
        // create a new socket.io server instance
        this.io = new Server(this.port);
        // create a new socket.io client instance
        this.io.on("connection", socket => {
            // add to salve to list of slaves
            this.slaves.enqueue( new Slave(socket) );
        });
    }

    async untilConnected(number=1) {
        return new Promise((resolve, reject) => {
            let interval, timeout;
            // set interval to check for connection
            interval = setInterval(() => {
                if(this.slaves.size() >= number) {
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
            let number = this.slaves.size();
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
        let sockets = await this.io.fetchSockets();
        console.log(sockets.map(s => s.id));
        // make into slave objects
        //this.sockets = this.sockets.map( s => new Slave(s) );
        // return
        return this.sockets.dequeue();
    }

    async getIdel() {
        return new Promise( async (resolve, reject) => {
            // if there are no slaves reject
            if(this.slaves.size() == 0) reject('no slaves');
            // get
            let slave = null;
            let isIdel = false;
            while(isIdel === false) {
                // get next slave
                slave = this.slaves.next()
                isIdel = await slave.isIdel();
                // check if slave is idel
                if(isIdel) resolve(slave);
            }
        });
    }
    
    // for every idel slave run the callback
    

}

export default Master;
