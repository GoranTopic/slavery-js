import { createServer } from "http";
import { Server } from "socket.io";
import process from 'node:process';
import Slave from "./Slave.js";
import Pool from "./Pool.js";
import log from '../utils/log.js';

let checkSlaveIdMiddleware = (socket, next) => {
    // check if slaveId is valid
    const slaveId = socket.handshake.auth.slaveId;
    if (slaveId) {
        socket.salveId = slaveId;
        return next();
    } else {
        return next(new Error("invalid slaveId"));
    }
}

class Master {
    /* Master class that will communicate with the slaves */
    constructor(options={}) {
        // if master options in options in set
        if(options.masterOptions) options = { ...options, ...options.masterOptions };
        this.options = options;
        // get options
        let { port, host, timeout, maxTransferSize, io, heartBeat } = this.options;
        this.port = port || 3003;
        // define host
        this.host = host || 'localhost';
        // define if network will be over lan or not
        this.isOverLan = this.host !== 'localhost';
        // define max transfer size for socket.io
        this.maxTransferSize = maxTransferSize || 1e9; // 1GB
        // set timeout for slave run 
        this.timeout_ms = timeout || null;
        // options for the socket.io server
        this.ioOptions = { 
            maxHttpBufferSize: this.maxTransferSize,
        }
        // create a new socket.io server instance
        if(io) {
            this.io = io;
        }else if(this.isOverLan) { // if this is over lan
            this.httpServer = createServer();
            this.io = new Server(this.httpServer, this.ioOptions);
        }else // create a new socket.io server instanece on localhost
            this.io = new Server(this.port, this.ioOptions );
        // create a new socket.io client instance
        this.slaves = new Pool();
        // this heatbeat is used to check if slave is idle
        this.heartBeat = heartBeat ?? 100; // 100ms
        // initilize
        this.init();
        // if it is over lan run start
        if(this.isOverLan)
            this.httpServer.listen(this.port, this.host, () => 
                console.log(`Master is running on http://${this.host}:${this.port}`)
            );
    }

    init() {
        // create a new socket.io client instance
        this.io.on("connection", this._handleSocketConnection.bind(this));
        this.io.on("reconnect", () => log("[master] on reconnect triggered"));
    }

    // this run the master function passed as callback
    async run(callback) {
        await callback(this);
    }

    async connected(number=1) {
        return new Promise((resolve, reject) => {
            let interval, timeout;
            // set interval to check for connection
            interval = setInterval(() => {
                if(this.slaves.size() >= number) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve();
                }
            }, this.heartBeat);
            // set timeout to reject if no connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject('timeout');
            }
            , 1000 * 60 ); // 1 minute
        });
    }

    async exit() {
        // broadcast exit to all slaves
        this.io.emit('_exit');
        // close all sockets
        this.io.close();
        // close all processes
        process.send('exit');
    }


    async newConnection(callback) {
        /* 
         * this function does not work! th problem is that we nned to return a slave 
         * in the _handleSocketConnection which is handles there response from the client
         * we can promisify the _handleSocketConnection but i cant be bothered
         */
        this.io.on("connection", socket => {
            this._handleSocketConnection(socket);
            let slave = this._handleSocketConnection(socket);   
            log('[master] new slave: ', slave);
            if(slave) callback(slave);
        });
    }

    async onIdle(callback) {
        return new Promise((resolve, reject) => {
            let interval = setInterval(async () => {
                let slave = await this.getIdle();
                callback(slave);
            }, this.heartBeat);
        });
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
            }, this.heartBeat);
            // set timeout to reject if no new connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject('timeout');
            }, 1000 * 60 ); // 1 minute
        });
    }

    async getSlaves() {
        // await until connection
        await this.connected();  
        // get all sockets
        return this.sockets.toArray()
    }

    async getIdle() {
        log('[master] awaiting getIdle');
        // search all sockets
        return new Promise( async (resolve, reject) => {
            // which check all the sockets
            let interval = setInterval(() => {
                // get the slave
                let slave = this.slaves.next();
                // check if slave is idle
                if(slave?.status === 'idle') {
                    clearInterval(interval);
                    //clearTimeout(timeout);
                    log('[master] got idle slave: ', slave.id);
                    //log('[master] pool queue: ', this.slaves.enabled.toArray());
                    resolve(slave);
                    // adjust heart beat
                    this._adjustHeartBeat();
                }
            }, this.heartBeat);
        }).catch( error =>
            console.error('[master] getIdle error: ', error)
        );
    }

    status() {
        let connections = this.slaves.getConnections().length;
        let idle = this.slaves.getEnabled().length;
        let busy = this.slaves.getDisabled().length;
        let idleRate = (idle / connections * 100).toFixed(2);
        let heartBeat = this.heartBeat;    
        return { connections, idle, busy, idleRate, heartBeat };
    }

    printStatus() {
        let {connections, idle, busy, idleRate, heartBeat } = this.status();
        console.log(`[master] connections: ${connections}, idle: ${idle}, busy: ${busy}, idleRate: ${idleRate} heartBeat: ${heartBeat}`);
    }

    _adjustHeartBeat() {
        // set min and max heart beat
        let heartBeatRange = [50, 5000];
        // set min and max heart beat
        let idleRateRange = [5, 15];
        // get idle rate
        let { idleRate } = this.status();
        // if idle rate is more than 20%
        log('[master] idleRate: ', idleRate);
        log('[master] this.heartBeat: ', this.heartBeat);
        if(this.heartBeat < heartBeatRange[0])  // if heart beat is less than lower limit
            this.heartBeat = this.heartBeat * 1.1;
        else if(this.heartBeat > heartBeatRange[1])  // if heart beat is more than upper limit
            this.heartBeat = this.heartBeat * 0.9;
        else {
            if(idleRate > idleRateRange[1])  // if idle rate is more than 20%
                this.heartBeat = this.heartBeat * 0.9;
            else if(idleRate < idleRateRange[0])  // if idle rate is less than 5%
                this.heartBeat = this.heartBeat * 1.1;
        }
    }

    _createSlaveId() {
        // create a new id
        let id = Math.random().toString(36).substr(2, 9);
        // check if id is already in use
        log('[master] created slaveId: ', id);
        if(this.slaves.has(id)) {
            // if so, create a new id
            return this._createSlaveId();
        }
        // return id
        return id;
    }

    _handleSocketConnection(socket) {
        // send session id to client
        log(`[master] new connection: ${socket.id}`);
        // check if slaveId is valid
        let slaveId = socket.handshake.auth.slaveId;
        if(slaveId) {
            // get slaveId from client
            log('[master] got slaveId: ', slaveId);
            // if we have that slaveId
            if(this.slaves.has(slaveId)) {
                log('[master] slaveId already in pool');
                let slave = this.slaves.get(slaveId);
                log('[master] got slave from pool: ', slave.id);
                // disconnect the old socket
                log('[master] disconnecting old socket: ', slave.socket.id);
                slave.socket.disconnect();
                // make new slave
                log('[master] making new slave');
                let newSlave = new Slave(slaveId, socket, this.options);
                // set the pool to the slave
                newSlave.setPool(this.slaves);
                // pass status value
                newSlave.status = slave.status;
                // add to pool
                log('[master] adding new slave to pool');
                this.slaves.add(slaveId, newSlave);
                // if busy, disable
                if(newSlave.status === 'busy'){
                    log('[master] checking if slave is busy');
                    this.slaves.disable(slaveId);
                }
            } else { 
                log('[master] slaveId not in pool');
                // if it is not in the pool, make new slave
                let newSlave = new Slave(slaveId, socket, this.options);
                // set the pool to the slave
                newSlave.setPool(this.slaves);
                // add to pool
                this.slaves.add(slaveId, newSlave);
            }
        } else { // if no slaveId
            log('[master] no slaveId');
            let newSlaveId = this._createSlaveId();
            log('[master] making new slaveId: ', newSlaveId);
            // send slaveId to client
            socket.emit("set_slave_id", newSlaveId);
            // make new slave
            socket.once("set_slave_id_result", slaveId => {
                log('[master] got slaveId back form client: ', slaveId);
                // make new slave and add tot he pool
                let newSlave = new Slave(slaveId, socket, this.options);
                // set the pool to the slave
                newSlave.setPool(this.slaves);
                // add to pool
                this.slaves.add(slaveId, newSlave);
            });
        }
    }

    _updateLine(str){
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(str +'\r\n');
    }

}

export default Master;
