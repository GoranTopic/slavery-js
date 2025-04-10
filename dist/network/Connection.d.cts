import { Socket } from 'socket.io';
import Listener from './types/Listener.cjs';

declare class Connection {
    private socket;
    private request_id;
    name?: string;
    id?: string;
    listeners: Listener[];
    type: 'client' | 'server';
    host?: string;
    port?: number;
    isConnected: boolean;
    socketId: string;
    targetType: 'client' | 'server';
    targetName?: string;
    targetId?: string;
    targetListeners: Listener[];
    targetHost?: string;
    targetPort?: number;
    private onConnectCallback;
    onDisconnectCallback: Function;
    onSetListenersCallback: Function;
    constructor({ socket, host, port, id, name, listeners, timeout, onConnect, onDisconnect, onSetListeners }: {
        id?: string;
        socket?: Socket;
        host?: string;
        port?: number;
        name?: string;
        listeners?: Listener[];
        timeout?: number;
        onConnect?: Function;
        onDisconnect?: Function;
        onSetListeners?: Function;
    });
    private initilaizeListeners;
    connected(): Promise<boolean>;
    getType(): "client" | "server";
    on(event: string, callback: Function): void;
    emit(event: string, data: any): void;
    getName(): string | undefined;
    getId(): string | undefined;
    getTargetName(): string | undefined;
    getTargetId(): string | undefined;
    setListeners(listeners: Listener[]): Promise<void>;
    addListeners(listeners: Listener[]): void;
    getTargetListeners(): Listener[];
    onSetListeners(callback: Function): void;
    onConnect(callback: Function): void;
    onDisconnect(callback: Function): void;
    private queryTargetListeners;
    private queryTargetName;
    query(event: string, data?: any): Promise<any>;
    send: (event: string, data?: any) => Promise<any>;
    private respond;
    getListeners(): any[];
    close(): void;
}

export { Connection as default };
