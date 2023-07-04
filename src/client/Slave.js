import { io } from "socket.io-client";

// initilized the Slave instance with socket io. try to connect to 
// create worker with each worker socket io connection
class Slave {
    constructor(options={}){
        let { host, port } = options
        // endpoint to connect to socke.io server
        this.host = host ?? "localhost";
        this.port = port ?? 3003;
        // endpoint to connect to socke.io server
        this.endpoint = `ws://${this.host}:${this.port}`;
        // has it connected to server?
        this.connected = false;
        // function to run on demand
        this.work = null;
        // function to run on demand
        this.callback = null;
        // is it working
        this.isIdel = true;
        // is it working
        this.isError = false;
        // list of slaves
        this.socket = null;
        // paramters to run with a function
        this.parameters = null
        // initilize
        this.init();
    }

    init(){
        // initilize the socket
        this.socket = io( this.endpoint );
        // sent up funtion that connects to server
        this.socket.on("connect", () => {
            //console.log('slave is connected')
            this.connected = true;
        });
        // if it disconnects
        this.socket.on("diconnect", () => {
            //console.log('slave is disconnected')
            this.connected = false;
        });
        // check if work is idel
        this.socket.on("_is_idel", () => {
            this.socket.emit("_is_idel_result", this.isIdel );
        });
        // check if there was a error
        this.socket.on("_is_error", () => {
            this.socket.emit("_is_error_result", this.isError );
        });
        // set up parameters
        this.socket.on("_set_parameters", parameters => {
            // add paramters to work
            this.parameters = parameters;
            this.socket.emit("_set_parameters_result", true );
        });
        // set work
        this.socket.on("_set_work", work => {
            // add paramters to work
            this.work = work;
            this.socket.emit("_set_work_result", true );
        });
        // if it sends a function to run
        this.socket.on("_work", workStr => {
            let func = eval( "(" + workStr + ")" );
            // check if we have a function to run
            if( func === null && this.work === null) 
                return this.error('no function passes and no function is set in slave')
            if( typeof func === "function" ) 
                // if a func we have a function
                return this.work(func);
            else if( typeof this.work === "function" )
                // if a func we have a function
                return this.work(this.work);
            else
                return this.error('no function to run found')
        });
        // run function
        this.socket.on("_run", params => {
            // add paramters to work
            this.params = params;
            // check if we have a function to run
            this.run();
        });
    }

    setCallback(callback){
        this.callback = callback
    }

    // this function is called when a functio is passed form the master
    // through the socket io connection
    async work(callback){
        return new Promise( 
            resolve => {
                // start work
                this.setIdel(false);
                // function 
                if(this.params) resolve(func(...this.params));
                else resolve(func());
            })
            .then( result => {
                // isIdel again
                this.setIdel(true);
                // send result back to master
                this.socket.emit("_work_result", result );
            })
            .catch( e => { 
                // isIdel again
                this.setIdel(true);
                // is error too
                this.isError = e;
                // send error back to master
                this.socket.emit("_wor_error", e );
                // print on terminal
                console.error('from slave: ', e);
            })
    }

    // this is used to wait until the slave is connected to the server
    async untilConnected(){
        return new Promise((resolve, reject) => {
            let interval, timeout;
            // set interval to check for connection
            interval = setInterval(() => {
                if(this.connected) {
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

    //  pass the on function to the socket io connection
    on(event, callback){
        this.socket.on(event, callback);
    }
    emit(event, data){
        this.socket.emit(event, data);
    }

    async waitEmitted(event){
        return new Promise((resolve, reject) => {
            // set interval to check for connection
            this.socket.on(event, data => {
                resolve(data);
            });
            // set timeout to reject if no connection
            // 1 minute
            setTimeout(() => reject('timeout'), 1000 * 60 ); 
        });
    }

    // this function is in the creation of the slave
    // it only should run when it revice the signal '_run'
    // on another thread
    async run(callback){
        // wait until connected
        try{
            // start work
            this.setIdel(false);
            // this rnns the function
            //console.log('running callback')
            let result = await this.callback(this.params, this);
            // send result to master
            this.socket.emit("_run_result", result );
            // isIdel again
            this.setIdel(true);
        }catch(e){
            // isIdel again
            this.setIdel(true);
            // is error too
            this.isError = e;
            // send error back to master
            this.socket.emit("_run_error", e.toString() );
            // print on terminal
            console.error(e);
        }
    }

    setIdel(isIdel){
        this.isIdel = isIdel;
        // send result to master
        this.socket.emit("_set_idel", isIdel );

    }


    error(eStr){
        // send error back to master
        this.socket.emit("_error", { error: eStr } );
        // print on terminal
        console.error(new Error(eStr));
        return;
    }

}

export default Slave
