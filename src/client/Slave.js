import { io } from "socket.io-client";
import { serializeError } from 'serialize-error';
import log from '../utils/log.js';

// initilized the Slave instance with socket io. try to connect to 
// create worker with each worker socket io connection
class Slave {
    constructor(options={}){
        if(options.slaveOptions)
            options = { 
                ...options, 
                ...options.slaveOptions
            }
        this.options = options;
        let { host, port, timeout, passErrorToMaster, crashOnError } = options
        // endpoint to connect to socke.io server
        this.host = host ?? "localhost";
        this.port = port ?? 3003;
        // set the timeout
        this.timeout_ms = timeout ?? null;
        // endpoint to connect to socke.io server
        this.endpoint = `ws://${this.host}:${this.port}`;
        // has it connected to server?
        this.connected = false;
        // id ot be used by the server
        this.id = null
        // function to run on demand
        this.work = null;
        // function to run on demand
        this.callbacks = {};
        // callbacks keep track of the callbacks that have ran 
        this.callbacksDone = {};
        // is it working
        this.isIdle = true;
        // is it working
        this.isError = false;
        // if the function _run is just done, usefuel for disconects
        this.isRunDone = false;
        // socket io connection
        this.socket = io( this.endpoint, { reconnection: true });
        // paramters to run with a function
        this.parameters = null
        // the return value of the function
        this.result = null
        // if master is in the same machine
        this.runningMasterOnSameMachine = true;
        // pass error to master, if this is false, it will crash the process
        //usefull for when running in docker container
        this.passErrorToMaster = passErrorToMaster ?? true;
        // if it should crash on error
        this.crashOnError = crashOnError ?? false;
        // user data, is accessed with .set and .get
        this.userData = {}
        // initilize
        this.init();
    }

    init(){
        // initilize the socket
        // sent up funtion that connects to server
        this.socket.on("connect", () => {
            log(`[${this.id}] slave is connected: ${this.socket.id}`)
            this.connected = true;
        });
        // if it disconnects
        this.socket.io.on("reconnect", (attempt) => {
            log(`[${this.id}] reconnecting: ${attempt}`)
        });
        // if it disconnects
        this.socket.io.on("diconnect", () => {
            log(`[${this.id}] slave is disconnected`)
            this.connected = false;
        });
        // get slave id from server
        this.socket.on("set_slave_id", slaveId => {
            this.socket.auth = { slaveId };
            this.id = slaveId;
            // send back to server
            this.socket.emit("set_slave_id_result", slaveId );
        });
        // check if work is idle
        this.socket.on("_is_idle", () => {
            // check if we are idle
            this.socket.emit("_is_idle_result", this.isIdle );
        });
        // check if a callback has ran successfully
        this.socket.on("_is_done", callback_name => {
            // check if we are idle
            this.socket.emit("_is_done_result", this.callbacksDone[callback_name] );
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
        // run function
        this.socket.on("_run", (params, callback_name) => {
            // add paramters to work
            this.params = params;
            // run the callback
            this.run(params, callback_name)
        });
        // _exit function
        this.socket.on("_exit", () => {
            // log 
            log(`[${this.id}] slave is exiting`)
            // send the exit signal to the primary process
            process.send('exit');
        });
    }

    // this function is in the creation of the slave
    // it only should run when it revice the signal '_run'
    // on another thread
    async run(params, callback_name){
        try{
            // start work
            this.setBusy();
            let timeout;
            // promesify the run function so that it will have a timeout
            this.result = await new Promise( (resolve, reject) => {
                if(this.timeout_ms){ 
                    timeout = setTimeout(() => { 
                        reject( new Error(`Slave has timed out: ${this.timeout_ms} ms`))
                    }, this.timeout_ms)
                };
                // get the callback
                if(this.callbacks[callback_name] === undefined) 
                    throw new Error(`callback ${callback_name} is not associated with any function`)
                let callback = this.callbacks[callback_name]
                // run the callback
                let result = callback(params, this)
                // clear timeout
                clearTimeout(timeout);
                // resolve the result
                resolve(result)
            }).catch( err => {
                // clear timeout
                clearTimeout(timeout);
                // throw error
                throw err
            })
            // send result back to master
            this.socket.emit("_run_result", this.result );
            // set callback done
            this.callbacksDone[callback_name] = true;
            // isIdle again
            this.setIdle();
        }catch(err){
            // is error too
            this.isError = err;
            // if it is on the same no machine as master print
            if(!this.runningMasterOnSameMachine)
                console.error(err)
            // send error back to master
            if(this.passErrorToMaster)
                this.socket.emit("_run_error", serializeError(err));
            // if it should crash on error
            if(this.crashOnError)
                throw err
            // set callback not done   
            this.callbacksDone[callback_name] = false;
            // isIdle again
            this.setIdle();
        }
    }

    setCallback(callbacks){
        // check if callback is an object
        if (typeof callbacks === 'object'){
            // check if every value of the object is a function
            if (Object.values(callbacks).every( v => typeof v === 'function' )){
                // check if every key is a string
                if (Object.keys(callbacks).every( k => typeof k === 'string' )){
                    // set the callbacks
                    this.callbacks = callbacks
                    // make also calbacks done
                    // remove the overwrite the callbacks value of the callback object
                    this.callbacksDone = Object.keys(callbacks)
                        .reduce( (acc, key) => {
                            acc[key] = false;
                            return acc;
                        }, {})
                } else 
                    throw new Error('every key of the callback object must be a string')
            } else 
                throw new Error('every value of the callback object must be a function')
        } else if (typeof callbacks === 'function'){
            // set the callbacks
            this.callbacks['default'] = callbacks
            // make also calbacks done
            this.callbacksDone['default'] = false;
        }
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
        }).catch( err => {
            console.error(err);
        });
    }

    set(key, value){
        this.userData[key] = value;
    }
    save = this.set;

    
    get(key){
        return this.userData[key];
    }
    load = this.get;

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
        }).catch( err => {
            console.error(err);
        })
    }

    setIdle(){
        this.isIdle = true;
        // send result to master
        //this.socket.emit("_set_idle", true);
    }

    setBusy(){
        this.isIdle = false;
        // send result to master
        //this.socket.emit("_set_idle", false );
    }

    error(eStr){
        // send error back to master
        this.socket.emit("_error", { error: eStr } );
        // print on terminal
        console.error(new Error(eStr));
        return;
    }

    async _ping_master(){
        /* check if the master is alive */
        return new Promise((resolve, reject) => {
            // make a timeout
            let timeout = 1000 * 10; // 10 seconds
            const timeoutId = setTimeout(() => {
                reject(false); // Reject the promise if timeout occurs
            }, timeout);
            // ping master
            this.socket.emit("_ping", true);
            // wait for response
            this.socket.on("_pong", (result) => {
                clearTimeout(timeoutId); // Cancel the timeout
                resolve(true); // Resolve promise
            });
        }).catch( err => {
            console.error(err);
        });
    }

    _json_size(json){
        return Buffer.byteLength(JSON.stringify(json))
    }

    _reconnect(){
        //make a new socket io connection with the same id
        this.socket = io(this.url, {
            auth: {
                slaveId: this.id
            }
        });
        // initialize the socket io connection
        this.init();
    }

}

export default Slave
