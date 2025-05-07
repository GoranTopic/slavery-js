import { io } from "socket.io-client";
import { Socket } from 'socket.io';
import log from '../utils/log.js';
import type Listener from './types/Listener.js';

class Connection {
    /*
     * this class is manager for the socket instance
     * it takes either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     *
     * it manages conenction, the listeners and the available emitters */
    private socket: Socket | any;
    private request_id: number = 0;
    // this node information
    public name?: string;
    public id?: string;
    public listeners: Listener[] = [];
    public type: 'client' | 'server';
    public host?: string;
    public port?: number;
    // is connected or not
    public isConnected: boolean;
    // ot target of the socket
    public socketId: string;
    public targetType: 'client' | 'server';
    public targetName?: string;
    public targetId?: string;
    public targetListeners: Listener[] = [];
    public targetHost?: string;
    public targetPort?: number;
    // callbacks
    private onConnectCallback: Function;
    public onDisconnectCallback: Function;
    public onSetListenersCallback: Function;
    private timeout: number;

    /*
     * @param Node: Node
     * @param socket: Socket
     * @param host: string
     * @param port: number
     * @param id: string
     * @param name: string
     * */

    constructor({ socket, host, port, id, name, listeners, timeout,
                onConnect, onDisconnect, onSetListeners } : {
        id?: string, socket?: Socket, host?: string,
        port?: number, name?: string, listeners?: Listener[],
        timeout?: number, onConnect?: Function, onDisconnect?: Function,
        onSetListeners?: Function
    }) {
        // callbacks
        this.onConnectCallback = onConnect || (() => {});
        this.onDisconnectCallback = onDisconnect || (() => {});
        this.onSetListenersCallback = onSetListeners || (() => {});
        this.timeout = timeout || 5 * 60 * 1000; // default 5 minutes
        // set listeners
        if(listeners) this.listeners = listeners;
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
        } else if (host && port && id) {
            this.type = 'client';
            this.targetType = 'server';
            // use the id
            this.id = id;
            this.socket = io(`ws://${host}:${port}`, {
                auth: { id },
                timeout: this.timeout,
            });
            // since we are not connected yet
            this.isConnected = false;
        } else
            throw new Error('Connection must have either a socket and a name or a host and port');
        // set the socket id
        this.socketId = this.socket.id;
        // initialize the listeners
        this.initilaizeListeners()
    }

    private initilaizeListeners(): void {
        /* this function inizializes the default listeners for the socket */
        // set the object listeners
        this.listeners.forEach( l => {
            this.socket.removeAllListeners(l.event);
            this.socket.on(l.event, this.respond(l.event, async (parameters:any) => {
                //log(`[${this.id}] [Connection][initilaizeListeners] got event: ${l.event} from ${this.targetName}: `, parameters)
                return await l.callback(parameters);
            }));
        });
        // if target is asking for connections
        this.socket.on("_listeners", this.respond("_listeners", () => this.getListeners()));
        // if the target is sending a their listeners
        this.socket.on("_set_listeners", this.respond("_set_listeners", (listeners: string[]) => {
            //log(`[${this.id}] [Connection][Node] got liteners from ${this.targetName}: `, listeners)
            this.targetListeners =
                listeners.map(event => ({ event, callback: () => {} }));
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
        this.socket.on("reconnect", async (attempt: number) => {
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

    public async connected(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let interval: NodeJS.Timeout;
            let timeout: NodeJS.Timeout
            // set interval to check for connection
            interval = setInterval(() => {
                if(this.isConnected) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100); // 100 ms
            // set timeout to reject if no connection
            timeout = setTimeout(() => {
                clearInterval(interval);
                reject(false);
            }, 1000 * 60 ); // 1 minute
        })
    }


    public getType(){
        return this.type;
    }

    public on(event: string, callback: Function): void {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any): void {
        this.socket.emit(event, data);
    }

    public getName(): string | undefined {
        return this.name;
    }

    // this is the id of the conenction?
    public getId(): string | undefined {
        return this.id;
    }

    public getTargetName(): string | undefined {
        return this.targetName;
    }

    // this is the id of the target client
    public getTargetId(): string | undefined {
        return this.targetId;
    }

    public async setListeners(listeners: Listener[]): Promise<void> {
        // set the listeners on the socket
        listeners.forEach( l => {
            this.listeners.push(l);
            // remove the listener if it exists
            this.socket.removeAllListeners(l.event);
            // add new listener
            this.socket.on(l.event, this.respond(l.event, async (parameters:any) => {
                // run the callback defined in the listner
                return await l.callback(parameters);
            }));
        });
        // update the listeners on the target
        if(this.type === 'server'){
            await this.query('_set_listeners', listeners.map(listener => listener.event));
        }
    }

    public addListeners(listeners: Listener[]): void {
        // make sure we are not adding the same listener
        const eventMap = new Map(this.listeners.map(l => [l.event, l]));
        // add the listeners
        listeners.forEach( l => eventMap.set(l.event, l) );
        // set the listeners in the connection
        this.listeners = Array.from(eventMap.values());
        // set the listeners on the socket
        this.setListeners(this.listeners);
    }

    public getTargetListeners(): Listener[] {
        return this.targetListeners;
    }

    public onSetListeners(callback: Function): void {
        this.onSetListenersCallback = callback;
    }

    public onConnect(callback: Function): void {
        this.onConnectCallback = callback;
    }

    public onDisconnect(callback: Function): void {
        this.onDisconnectCallback = callback;
    }

    private queryTargetListeners(): Promise<Listener[]> {
        // query the target listeners
        return this.query('_listeners');
    }

    private queryTargetName(): Promise<string> {
        // query the target name
        return this.query('_name');
    }

    // this function need to be awaited
    public query(event: string, data?: any): Promise<any> {
        /* this function makes the query to the socket and waits for the response */
        return new Promise((resolve, reject) => {
            // set a time out
            let timeout = setTimeout( () => { 
                reject(`Query of '${event}' timed out after ${this.timeout}ms`)
            }, this.timeout); // default 1 minute
            // get request id
            let request_id = ++this.request_id;
            if (this.request_id >= Number.MAX_SAFE_INTEGER - 1) this.request_id = 0;
            // send the query
            this.socket.emit(event, {data, request_id: request_id});
            this.socket.on(event + `_${request_id}_response`, (response: any) => {
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

    public send = this.query;

    private respond(event: string, callback: Function) {
        /* this is a wrapper function to respond to a query */
        return async (parameters: any) => {
            let data = parameters.data;
            let request_id = parameters.request_id;
            let response = await callback(data);
            this.socket.emit(event + `_${request_id}_response`, response);
        }
    }

    public getListeners(): any[] {
        if(this.type === 'server')
            return this.listeners;
        else if(this.type === 'client')
            return this.socket._callbacks;
        else
            throw new Error('Connection type not recognized');
    }

    public close(): void {
        this.socket.disconnect();
    }

}

export default Connection;
