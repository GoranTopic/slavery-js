import { io } from "socket.io-client";
import { Socket } from 'socket.io';
import log from '../utils/log'


interface Listener {
    event: string;
    callback: Function;
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
    // this node information
    public name?: string;
    public id?: string;
    public listeners: Listener[] = [];
    public type: 'client' | 'server';
    // is connected or not
    public isConnected: boolean;
    // ot target of the socket
    public socketId: string;
    public targetType: 'client' | 'server';
    public targetName?: string;
    public targetId?: string;
    public targetListeners: Listener[] = [];
    // callbacks
    private onConnectCallback: Function;
    public onDisconnectCallback: Function;

    /*
     * @param Node: Node
     * @param socket: Socket
     * @param host: string
     * @param port: number
     * */
    constructor({ socket, host, port, id, name, onConnect, onDisconnect, } :
                { id?: string, socket?: Socket, host?: string, port?: number, name?: string, onConnect?: Function, onDisconnect?: Function }) {
        // set the socket id
        this.socketId = this.socket.id;
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
        // if target is aking for connections
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

    private setListener(event: string, callback: Function): void {
        // add the listener
        this.listeners.push({ event, callback });
        this.socket.on(event, callback);
    }

    public async setListeners(listeners: Listener[]): Promise<void> {
        listeners.forEach(
            l => this.setListener(l.event, l.callback)
        );
        // update the listeners on the target
        await this.query('_setListeners', listeners.map(listener => listener.event));
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

                      
    private query(event: string, data?: any): Promise<any> {
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

    public close(): void {
        this.socket.disconnect();
    }

}

export default Connection;
