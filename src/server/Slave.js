import { deserializeError } from 'serialize-error';
import log from '../utils/log.js';

class Slave {
    /**
     * constructor
     * @param {string} slaveId - id of slave
     * @param {Socket} socket - socket.io socket
     * @param {string} name - name of slave
     **/
    constructor(slaveId, socket) {
        this.name = 'Slave';
        this.status = 'idle';
        this.socket = socket;
        this.id = slaveId;
        this.return = null;
        this.pool = null;
        this.querySlave = false;
        this.init();
    }

    init() {
        // on connect
        this.socket.on('connect', () => {
            log('[Slave] connected to slave: ' + this.id);
        });
        // on disconnect
        this.socket.on('disconnect', () => {
            log('[Slave] disconnected from slave: ' + this.id);
        });
        // on reconnect
        this.socket.on('reconnect', () => {
            log('[Slave] got result from slave: ' + this.id);
        });
        this.socket.on('_ping', result => {
            log('[Slave] got ping from slave: ' + this.id);
            log('[Slave] result', result);
            this.socket.emit('_pong');
        });

        // initiliaze listeneres with slave
        this.socket.on('_set_idle', idle => {
            if (idle) this._setIdle();
            else this._setBusy();
        });
        // error handling from socket
        this.socket.on('_error', e => {
            this._setIdle();
            this.error = 'error';
            console.error('error from slave: ', e.error);
        });
        // set reciver for result
        this.socket.on('_result', result => {
            log('[Slave] got result from slave: ' + result );
            this._setIdle();
            this.return = result;
        });  
         
    }

    // run work on slave
    async run(params) {
        return new Promise((resolve, reject) => {
            this._setBusy();
            this.socket.emit('_run', params);
            // if result is returned
            this.socket.once("_run_result", res => {
                log('[slave] got _run_result from slave ', this.id);
                // set state as idle
                this._setIdle();
                // set return value
                this.return = res;
                // remove error listener
                this.socket.off('_run_error', e => { });
                // resolve promise
                resolve(res);
            });
            // if error occurs
            this.socket.once('_run_error', e => {
                log('[Slave] get _run_error from slave ', this.id );
                // set state as idle
                this._setIdle()
                // remove result listener
                this.socket.off('_run_result', res => { });
                // deserialize error
                let error = deserializeError(e);
                // reject promise
                reject(error);
            });
        });
    }


    // send paramteres to the slave
    async setParameers(parameters) {
        return new Promise((resolve, reject) => {
            this.socket.emit('_set_parameters', work);
            this.socket.once('_set_parameters_result', res => {
                resolve(res);
            });
        });
    }


    // set work to be done by slave
    async setWork(work) {
        return new Promise((resolve, reject) => {
            this.socket.emit('_set_work', work);
            this.socket.once('_set_work_result', (result) => {
                resolve(result);
            });
        });
    }

    // check if salve is idle
    async isIdle() {
        if(this.querySlave)
            return new Promise((resolve, reject) => {
                this.socket.emit('_is_idle' );
                this.socket.once('_is_idle_result', (result) => {
                    resolve(result);
                });
            });
        else 
            return this.status === 'idle'
    }

    // check if there is an error
    async hasError() {
        if(this.querySlave){
            return new Promise((resolve, reject) => {
                this.socket.emit('_is_error' );
                this.socket.once('_is_error_result', result => {
                    resolve(result);
                });
            });
        } else 
            return this.error
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }

    setPool(pool) {
        this.pool = pool;
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }

    _setIdle(){
        // set state as idle
        this.status = 'idle';
        // enable in the pool
        this.pool.enable(this.id);
    }

    _setBusy(){
        // set state as busy
        this.status = 'busy';
        // disable in the pool
        this.pool.disable(this.id);
    }

}


export default Slave;
