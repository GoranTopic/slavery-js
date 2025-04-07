"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
class Connection {
    /*
     * this class is manager for the socket instance
     * it takes either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     *
     * it manages conenction, the listeners and the available emitters */
    socket;
    request_id = 0;
    // this node information
    name;
    id;
    listeners = [];
    type;
    host;
    port;
    // is connected or not
    isConnected;
    // ot target of the socket
    socketId;
    targetType;
    targetName;
    targetId;
    targetListeners = [];
    targetHost;
    targetPort;
    // callbacks
    onConnectCallback;
    onDisconnectCallback;
    onSetListenersCallback;
    /*
     * @param Node: Node
     * @param socket: Socket
     * @param host: string
     * @param port: number
     * @param id: string
     * @param name: string
     * */
    constructor({ socket, host, port, id, name, listeners, timeout, onConnect, onDisconnect, onSetListeners }) {
        // callbacks
        this.onConnectCallback = onConnect || (() => { });
        this.onDisconnectCallback = onDisconnect || (() => { });
        this.onSetListenersCallback = onSetListeners || (() => { });
        // set listeners
        if (listeners)
            this.listeners = listeners;
        // if get a socket to connect to the server
        if (socket && name) {
            this.type = 'server';
            this.name = name;
            this.targetType = 'client';
            // the socket
            this.socket = socket;
            // get the id of client
            this.targetId = socket.handshake.auth.id;
            //log('[Connection][server] targetId: ', this.targetId)
            // since we are already getting the socket
            this.isConnected = true;
            // if get a host and port to connect to the server
        }
        else if (host && port && id) {
            this.type = 'client';
            this.targetType = 'server';
            // use the id
            this.id = id;
            this.socket = (0, socket_io_client_1.io)(`ws://${host}:${port}`, {
                auth: { id },
                timeout: timeout || 1000 * 60 // 1 minute
            });
            // since we are not connected yet
            this.isConnected = false;
        }
        else
            throw new Error('Connection must have either a socket and a name or a host and port');
        // set the socket id
        this.socketId = this.socket.id;
        // initialize the listeners
        this.initilaizeListeners();
    }
    initilaizeListeners() {
        /* this function inizializes the default listeners for the socket */
        // set the object listeners 
        this.listeners.forEach(l => {
            this.socket.removeAllListeners(l.event);
            this.socket.on(l.event, this.respond(l.event, async (parameters) => {
                //log(`[${this.id}] [Connection][initilaizeListeners] got event: ${l.event} from ${this.targetName}: `, parameters)
                return await l.callback(parameters);
            }));
        });
        // if target is asking for connections
        this.socket.on("_listeners", this.respond("_listeners", () => this.getListeners()));
        // if the target is sending a their listeners
        this.socket.on("_set_listeners", this.respond("_set_listeners", (listeners) => {
            //log(`[${this.id}] [Connection][Node] got liteners from ${this.targetName}: `, listeners)
            this.targetListeners =
                listeners.map(event => ({ event, callback: () => { } }));
            this.onSetListenersCallback(this.targetListeners);
            return 'ok';
        }));
        // if target is asking for name
        this.socket.on("_name", this.respond("_name", () => this.name));
        // if target is asking for id
        this.socket.on("_id", () => this.id);
        // on connected
        this.socket.on("connect", async () => {
            //log(`[connection][${this.socket.id}] is connected, querying target name and listeners:`)
            // ask for listeners
            this.targetName = await this.queryTargetName();
            this.targetListeners = await this.queryTargetListeners();
            //log(`[connection][${this.socket.id}] target name: ${this.targetName}, target listeners: ${this.targetListeners}`)
            this.isConnected = true;
            this.onConnectCallback(this);
        });
        // if it disconnects
        this.socket.on("reconnect", async (attempt) => {
            //log(`[connection][${this.socket.id}] is reconnected, attempt: ${attempt}`)
            this.targetName = await this.queryTargetName();
            this.targetListeners = await this.queryTargetListeners();
            this.isConnected = true;
            this.onConnectCallback(this);
        });
        // if it disconnects
        this.socket.on("diconnect", () => {
            //log(`[connection][${this.socket.id}] is disconnected`)
            this.isConnected = false;
            this.onDisconnectCallback(this);
        });
    }
    async connected() {
        return new Promise((resolve, reject) => {
            let interval;
            let timeout;
            // set interval to check for connection
            interval = setInterval(() => {
                if (this.isConnected) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100); // 100 ms
            // set timeout to reject if no connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject(false);
            }, 1000 * 60); // 1 minute
        });
    }
    getType() {
        return this.type;
    }
    on(event, callback) {
        this.socket.on(event, callback);
    }
    emit(event, data) {
        this.socket.emit(event, data);
    }
    getName() {
        return this.name;
    }
    // this is the id of the conenction?
    getId() {
        return this.id;
    }
    getTargetName() {
        return this.targetName;
    }
    // this is the id of the target client
    getTargetId() {
        return this.targetId;
    }
    async setListeners(listeners) {
        // set the listeners on the socket
        listeners.forEach(l => {
            this.listeners.push(l);
            // remove the listener if it exists
            this.socket.removeAllListeners(l.event);
            // add new listener
            this.socket.on(l.event, this.respond(l.event, async (parameters) => {
                // run the callback defined in the listner
                return await l.callback(parameters);
            }));
        });
        // update the listeners on the target
        if (this.type === 'server') {
            //let response = 
            await this.query('_set_listeners', listeners.map(listener => listener.event));
            //if(response === 'ok') log('[Connection]<setListeners> listeners set successfully')
        }
    }
    addListeners(listeners) {
        // make sure we are not adding the same listener
        const eventMap = new Map(this.listeners.map(l => [l.event, l]));
        // add the listeners
        listeners.forEach(l => eventMap.set(l.event, l));
        // set the listeners in the connection
        this.listeners = Array.from(eventMap.values());
        // set the listeners on the socket
        this.setListeners(this.listeners);
    }
    getTargetListeners() {
        return this.targetListeners;
    }
    onSetListeners(callback) {
        this.onSetListenersCallback = callback;
    }
    onConnect(callback) {
        this.onConnectCallback = callback;
    }
    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }
    queryTargetListeners() {
        // query the target listeners
        return this.query('_listeners');
    }
    queryTargetName() {
        // query the target name
        return this.query('_name');
    }
    // this function need to be awaited
    query(event, data) {
        /* this function makes the query to the socket and waits for the response */
        return new Promise((resolve, reject) => {
            // set a time out
            let timeout = setTimeout(() => { reject('timeout'); }, 1000 * 60); // 1 minute
            // get request id
            let request_id = ++this.request_id;
            if (this.request_id >= Number.MAX_SAFE_INTEGER - 1)
                this.request_id = 0;
            // send the query
            this.socket.emit(event, { data, request_id: request_id });
            this.socket.on(event + `_${request_id}_response`, (response) => {
                //log('[Connection][Query] got response from ', this.targetType, 'event: ', event, 'response: ', response)
                // clear the timeout
                clearTimeout(timeout);
                // clear the listener
                this.socket.removeAllListeners(event + `_${request_id}_response`);
                // resolve the response
                resolve(response);
            });
        });
    }
    send = this.query;
    respond(event, callback) {
        /* this is a wrapper function to respond to a query */
        return async (parameters) => {
            let data = parameters.data;
            let request_id = parameters.request_id;
            let response = await callback(data);
            this.socket.emit(event + `_${request_id}_response`, response);
        };
    }
    getListeners() {
        if (this.type === 'server')
            return this.listeners;
        else if (this.type === 'client')
            return this.socket._callbacks;
        else
            throw new Error('Connection type not recognized');
    }
    close() {
        this.socket.disconnect();
    }
}
exports.default = Connection;
//# sourceMappingURL=Connection.js.map