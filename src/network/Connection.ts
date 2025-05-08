import { io } from "socket.io-client";
import { Socket } from 'socket.io';
import log from '../utils/log.js';
import type Listener from './types/Listener.js';

type ConnectionOptions = {
    timeout?: number,
    listeners?: Listener[],
    onConnect?: Function,
    onDisconnect?: Function,
    onSetListeners?: Function
};

type ConnectionParametersServer = {
    socket: Socket,
    name: string,
    options?: ConnectionOptions
};

type ConnectionParametersClient = {
    host: string,
    port: number,
    id: string,
    options?: ConnectionOptions
};

function isServer(params: ConnectionParametersServer | ConnectionParametersClient): params is ConnectionParametersClient {
  return 'host' in params && 'port' in params && 'id' in params;
}

function isClient(params: ConnectionParametersServer | ConnectionParametersClient): params is ConnectionParametersServer {
  return 'socket' in params && 'name' in params;
}


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
    public options: {
        timeout: number,
        listeners: Listener[],
        onConnect: Function,
        onDisconnect: Function,
        onSetListeners: Function
    };

    /*
     * @param Node: Node
     * @param socket: Socket
     * @param host: string
     * @param port: number
     * @param id: string
     * @param name: string
     * */

    constructor(params : ConnectionParametersServer | ConnectionParametersClient) {
        // options
        this.options = { 
            // callbacks
            onConnect: params?.options?.onConnect || (() => {}),
            onDisconnect: params?.options?.onDisconnect || (() => {}),
            onSetListeners: params?.options?.onSetListeners || (() => {}),
            // listeners
            listeners: params?.options?.listeners || [],
            // timeout
            timeout: params?.options?.timeout || 5 * 60 * 1000, // 5 minutes
        };
        // if get a socket to connect to the server
        if (isClient(params)) {
            params = params as unknown as ConnectionParametersServer;
            this.type = 'server';
            this.name = params.name;
            this.targetType = 'client';
            // the socket
            this.socket = params.socket;
            // get the id of client
            this.targetId = params.socket.handshake.auth.id;
            //log('[Connection][server] targetId: ', this.targetId)
            // since we are already getting the socket
            this.isConnected = true;
            // if get a host and port to connect to the server
        } else if (isServer(params)) {
            params = params as unknown as ConnectionParametersClient;
            this.type = 'client';
            this.targetType = 'server';
            // use the id
            this.id = params.id;
            this.socket = io(`ws://${params.host}:${params.port}`, {
                auth: { id: params.id },
                timeout: this.options.timeout || 5 * 60 * 1000, // default 5 minutes
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
        this.options.listeners.forEach( l => {
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
            this.options.onSetListeners(this.targetListeners);
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
            this.options.onConnect(this);
        });
        // if it disconnects
        this.socket.on("reconnect", async (attempt: number) => {
            //log(`[connection][${this.socket.id}] is reconnected, attempt: ${attempt}`)
            this.targetName = await this.queryTargetName();
            this.targetListeners = await this.queryTargetListeners();
            this.isConnected = true;
            this.options.onConnect(this);
        });
        // if it disconnects
        this.socket.on("diconnect", () => {
            //log(`[connection][${this.socket.id}] is disconnected`)
            this.isConnected = false;
            this.options.onDisconnect(this);
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
            this.options.listeners.push(l);
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
        const eventMap = new Map(this.options.listeners.map(l => [l.event, l]));
        // add the listeners
        listeners.forEach( l => eventMap.set(l.event, l) );
        // set the listeners in the connection
        this.options.listeners = Array.from(eventMap.values());
        // set the listeners on the socket
        this.setListeners(this.options.listeners);
    }

    public getTargetListeners(): Listener[] {
        return this.targetListeners;
    }

    public onSetListeners(callback: Function): void {
        this.options.onSetListeners = callback;
    }

    public onConnect(callback: Function): void {
        this.options.onConnect = callback;
    }

    public onDisconnect(callback: Function): void {
        this.options.onDisconnect = callback;
    }

    private queryTargetListeners(): Promise<Listener[]> {
        // query the target listeners
        return this.query('_listeners');
    }

    private queryTargetName(): Promise<string> {
        // query the target name
        return this.query('_name');
    }

    public async query(event: string, data?: any, retries = 3, retryDelay = 500): Promise<any> {
        let attempt = 0;
        const tryQuery = (): Promise<any> => {
            return new Promise((resolve, reject) => {
                const request_id = ++this.request_id;
                if (this.request_id >= Number.MAX_SAFE_INTEGER - 1) this.request_id = 0;
                const responseEvent = `${event}_${request_id}_response`;
                const timeoutDuration = this.options.timeout || 5000;
                const timeout = setTimeout(() => {
                    this.socket.removeAllListeners(responseEvent);
                    reject(new Error(`Query '${event}' timed out after ${timeoutDuration}ms (attempt ${attempt + 1})`));
                }, timeoutDuration);
                this.socket.once(responseEvent, (response: any) => {
                    clearTimeout(timeout);
                    resolve(response);
                });
                this.socket.emit(event, { data, request_id });
            });
        };
        while (attempt <= retries) {
            try {
                return await tryQuery();
            } catch (err) {
                if (attempt >= retries) {
                    throw new Error(`Query '${event}' failed after ${retries + 1} attempts: ${err}`);
                }
                attempt++;
                await new Promise((r) => setTimeout(r, retryDelay));
            }
        }
        // This should never be reached, but TypeScript wants a return or throw here
        throw new Error('Unexpected query failure');
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
            return this.options.listeners;
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
