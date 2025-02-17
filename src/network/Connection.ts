import { io } from "socket.io-client";
import { Socket } from 'socket.io';
import log from '../utils/log'
import Listener from './types/Listener';

class Connection {
    /* 
     * this class is manager for the socket instance
     * it takes either a socket or a host and port to create the socket
     * if it takes the host and port it will consider that connection is a server
     * if it takes a socket it will consider that connection is a client
     * 
     * it manages conenction, the listeners and the available emitters */
    private socket: Socket | any;
    // this node information
    public name?: string;
    public id?: string;
    public tag?: string;
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

    /*
     * @param Node: Node
     * @param socket: Socket
     * @param host: string
     * @param port: number
     * @param id: string
     * @param name: string
     * @param tag: string
     * */
    constructor({ socket, host, port, id, name, onConnect, onDisconnect, tag } : {
        id?: string, socket?: Socket, host?: string,
        port?: number, name?: string, tag?: string,
        onConnect?: Function, onDisconnect?: Function 
    }) {
        // set the socket id
        this.socketId = this.socket.id;
        // set the tag
        this.tag = tag || '';
        // callbacks 
        this.onConnectCallback = onConnect || (() => {});
        this.onDisconnectCallback = onDisconnect || (() => {});
        // if get a socket to connect to the server
        if (socket && name) {
            this.type = 'server';
            this.name = name;
            this.targetType = 'client';
            // the socket
            this.socket = socket;
            // get the id of client 
            this.targetId = socket.handshake.auth.id;
            // ask for the listeners
            this.targetListeners = socket.handshake.auth.listeners;
            // since we are already getting the socket
            this.isConnected = true;
            // if get a host and port to connect to the server
        } else if (host && port && id) {
            this.type = 'client';
            this.targetType = 'server';
            // use the id
            this.id = id;
            this.socket = io(`ws://${host}:${port}`, {
                auth: { id } 
            });
            // since we are not connected yet
            this.isConnected = false;
        } else 
            throw new Error('Connection must have either a socket or a host and port');
        // set the socket id
        // initialize the listeners
        this.initilaizeListeners()
    }

    private initilaizeListeners(): void {
        /* this function inizializes the default listeners for the socket */
        // if target is asking for connections
        this.socket.on("_listeners", () => {
            this.socket.emit("_listeners", this.listeners.map(listener => listener.event));
        });
        // if the target is sending a their listeners
        this.socket.on("_setListeners", (listeners: string[]) => {
            this.targetListeners = 
                listeners.map(event => ({ event, callback: () => {} }));
            this.socket.emit("_setListeners", 'ok');
        });
        // if target is asking for name
        this.socket.on("_name", () => {
            this.socket.emit("_name", this.name);
        });
        // if target is asking for id
        this.socket.on("_id", () => {
            this.socket.emit("_id", this.id);
        });
        // on connected
        this.socket.on("connect", async () => {
            log(`[connection][${this.socket.id}] is connected`)
            // ask for listeners
            this.targetName = await this.queryTargetName();
            this.targetListeners = await this.queryTargetListeners();
            this.isConnected = true;
            this.onConnectCallback(this);
        });
        // if it disconnects
        this.socket.io.on("reconnect", async (attempt: number) => {
            log(`[connection][${this.socket.id}] is reconnected, attempt: ${attempt}`)
            this.targetName = await this.queryTargetName();
            this.targetListeners = await this.queryTargetListeners();
            this.isConnected = true;
            this.onConnectCallback(this);
        });
        // if it disconnects
        this.socket.io.on("diconnect", () => {
            log(`[connection][${this.socket.id}] is disconnected`)
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

    public getId(): string | undefined {
        return this.id;
    }

    public getTargetName(): string | undefined {
        return this.targetName;
    }

    public getTargetId(): string | undefined {
        return this.targetId;
    }

    public getTag(): string | undefined {
        return this.tag;
    }

    private setListener(l: Listener): void {
        // add the listener
        this.listeners.push(l);
        this.socket.on(l.event, l.callback);
    }

    public async setListeners(listeners: Listener[]): Promise<void> {
        // make suer we are not adding the same listener
        const eventMap = new Map(this.listeners.map(l => [l.event, l]));
        // add the listeners
        listeners.forEach( l => eventMap.set(l.event, l) );
        // set the listeners in the connection
        this.listeners = Array.from(eventMap.values());
        // set the listeners on the socket
        listeners.forEach( l => this.setListener(l) );
        // update the listeners on the target
        await this.query('_set_listeners', listeners.map(listener => listener.event));
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
            let timeout = setTimeout( () => { reject('timeout') }, 1000 * 60); // 1 minute
            this.socket.emit(event, data)
            this.socket.on(event, (response: any) => {
                // clear the timeout
                clearTimeout(timeout);
                // clear the listener
                this.socket.removeAllListeners(event);
                // if there is an error
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    public send = this.query;

    public static async isPortAvailable(host: string, port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let timeout = 3000;
            const url = `http://${host}:${port}`;
                const socket = io(url, {
                timeout,
                reconnection: false
            });
            // connect to the socket
            socket.on('connect', async () => {
                // set timeout to for 3 seconds
                socket.disconnect();
                resolve(true);
            });
            // if the connection is not established
            socket.on('connect_error', (err: any) => {
                socket.disconnect();
                resolve(false);
            });
            // if the connection is not established
            socket.on('error', (err: any) => {
                socket.disconnect();
                resolve(false);
            });
        });
    }

    public static nextAvailablePort(host: string, port: number): Promise<{host: string, port: number}> {
        // from the especified port, check the next available port sequentially
        return new Promise(async (resolve, reject) => {
            let available = false;
            let nextPort = port;
            while (!available) {
                if( await Connection.isPortAvailable(host, nextPort)) {
                    resolve({ host, port: nextPort });
                } else {
                    nextPort += 1;
                }
            }
        });
    }

    public static async findAvailablePorts(host: string, port: number, n: number): Promise<{host: string, port: number}[]> {
        // find the next n available ports
        return new Promise(async (resolve, reject) => {
            let availablePorts: {host: string, port: number}[] = [];
            for (let i = 0; i < n; i++) {
                const availablePort = await Connection.nextAvailablePort(host, port);
                availablePorts.push(availablePort);
                port = availablePort.port + 1;
            }
            resolve(availablePorts);
        });
    }

    public close(): void {
        this.socket.disconnect();
    }

}

export default Connection;
