import { Socket } from 'socket.io';
import Listener from './types/Listener.cjs';

type ConnectionOptions = {
    timeout?: number;
    listeners?: Listener[];
    onConnect?: Function;
    onDisconnect?: Function;
    onSetListeners?: Function;
};
type ConnectionParametersServer = {
    socket: Socket;
    name: string;
    options?: ConnectionOptions;
};
type ConnectionParametersClient = {
    host: string;
    port: number;
    id: string;
    options?: ConnectionOptions;
};
declare class Connection {
    private socket;
    private request_id;
    name?: string;
    id?: string;
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
    options: {
        timeout: number;
        listeners: Listener[];
        onConnect: Function;
        onDisconnect: Function;
        onSetListeners: Function;
    };
    constructor(params: ConnectionParametersServer | ConnectionParametersClient);
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
    query(event: string, data?: any, retries?: number, retryDelay?: number): Promise<any>;
    send: (event: string, data?: any, retries?: number, retryDelay?: number) => Promise<any>;
    private respond;
    getListeners(): any[];
    close(): void;
}

export { Connection as default };
