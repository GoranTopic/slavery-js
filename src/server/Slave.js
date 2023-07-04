class Slave {
    /**
     * @param {Socket} socket - socket.io socket
     * @param {string} name - name of slave
     **/
    constructor(socket) {
        this.name = 'Slave';
        this.status = 'idle';
        this.socket = socket;
        this.return = null;
        this.init();
    }

    init() {
        // initiliaze communication with slave
        this.socket.on('_set_idel', idel => {
            if (idel) this.status = 'idle';
            else this.status = 'busy';
        });
        // error handling from socket
        this.socket.on('_error', e => {
            this.status = 'error';
            console.error('error from slave: ', e.error);
        });
        // set reciver for result
        this.socket.on('_result', result => {
            this.return = result;
        });  
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }

    // run work on slave
    async run(params) {
        return new Promise((resolve, reject) => {
            this.status = 'busy';
            this.socket.emit('_run', params);
            // if result is returned
            this.socket.on('_run_result', result => {
                this.status = 'idle';
                this.return = result;
                resolve(result);
            });
            // if error occurs
            this.socket.on('_run_error', error => {
                this.status = 'idle';
                reject(error, 'error from slave: ', this.socket.id);
            });
        });
    }

    // set parameters for slave
    async setParameers(parameters) {
        return new Promise((resolve, reject) => {
            this.socket.emit('_set_parameters', work);
            this.socket.on('_set_parameters_result', (result) => {
                resolve(result);
            });
        });
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }
    emit(event, data) {
        this.socket.emit(event, data);
    }

    // set work to be done by slave
    async setWork(work) {
        return new Promise((resolve, reject) => {
            this.socket.emit('_set_work', work);
            this.socket.on('_set_work_result', (result) => {
                resolve(result);
            });
        });
    }

    // check if salve is idel
    async isIdel() {
        return new Promise((resolve, reject) => {
            this.socket.emit('_is_idel' );
            this.socket.on('_is_idel_result', (result) => {
                resolve(result);
            });
        });
    }

    async isError() {
        return new Promise((resolve, reject) => {
            this.socket.emit('_is_error' );
            this.socket.on('_is_error_result', result => {
                //console.log('error_run: ', result);
                resolve(result);
            });
        });
    }
}


export default Slave;
