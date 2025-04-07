import { Socket } from 'socket.io';
import http from 'http';

type EntryOptions = {
    host: string;
    port: number;
};
declare const entry: (entryOptions: EntryOptions) => ProxyConstructor;

type ServiceAddress$1 = {
    name: string;
    host: string;
    port: number;
};

type SlaveMethods = {
    [key: string]: (...args: any[]) => any;
};

type Options = {
    host?: string;
    port?: number;
    nm_host?: string;
    nm_port?: number;
    max_queued_requests?: number;
    number_of_nodes?: number;
    max_number_of_nodes?: number;
    min_number_of_nodes?: number;
    increase_processes_at_requests?: number;
    decrease_processes_at_idles?: number;
    throwError?: boolean;
    returnError?: boolean;
    logError?: boolean;
    auto_scale?: boolean;
};

type Parameters$1 = {
    host: string;
    port: number;
};
declare class PeerDicoveryServer {
    name: string;
    host: string;
    port: number;
    private cluster;
    private network;
    private services;
    constructor(params: Parameters$1);
    start(): Promise<void>;
    private getListeners;
    private registerService;
    private getServices;
    private removeService;
    exit(): boolean;
}

interface Listener {
    event: string;
    parameters?: Array<any>;
    callback: Function;
}

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

declare class Pool<T> {
    private enabled;
    private disabled;
    private items;
    constructor();
    has(id: string): boolean;
    add(id: string, item: T): boolean;
    disable(id: string): boolean;
    disableUntil(id: string, timeOrCondition: number | Function): undefined;
    enable(id: string): boolean;
    nextAndEnable(): string | boolean;
    rotate(): T | null;
    hasEnabled(): boolean;
    nextAndDisable(): T | null;
    remove(id: string): T | null;
    removeOne(): T | null;
    get(id: string): T | null;
    size(): number;
    length(): number;
    getEnabledCount(): number;
    getDisabledCount(): number;
    isEmpty(): boolean;
    _lookUp(id: string): {
        index: number;
        list: string;
    } | false;
    toArray(): T[];
    print(): void;
    getEnabled(): string[];
    getEnabledObjects(): T[];
    getDisabled(): string[];
    getDisabledObjects(): T[];
    getConnections(): string[];
    healthCheck(): boolean;
    next: () => T | null;
    pop: () => T | null;
    shift: () => string | boolean;
    unshift: (id: string, item: T) => boolean;
    push: (id: string, item: T) => boolean;
    count: () => number;
    removeAt: (id: string) => T | null;
    removeItem: (id: string) => T | null;
}

type Parameters = {
    service_name: string;
    peerServicesAddresses?: ServiceAddress$1[];
    peerDiscoveryAddress?: {
        host: string;
        port: number;
    };
    mastercallback?: (...args: any[]) => any;
    slaveMethods?: SlaveMethods;
    options?: Options;
};
declare class Service {
    name: string;
    host: string;
    port: number;
    private nodes?;
    private stash;
    private processBalancer?;
    private requestQueue;
    nm_host: string;
    nm_port: number;
    number_of_nodes: number;
    private masterCallback?;
    private slaveMethods;
    private peerAddresses;
    private peerDiscoveryAddress?;
    private peerDiscovery?;
    private cluster?;
    private network?;
    private options;
    private servicesConnected;
    constructor(params: Parameters);
    start(): Promise<void>;
    private initialize_master;
    private initialize_slaves;
    private initlize_node_manager;
    private initialize_request_queue;
    private initialize_process_balancer;
    private getServiceListeners;
    private handle_request;
    private handle_peer_discovery;
    private getServices;
    exit(): boolean;
    set: (key: any, value?: any) => Promise<void>;
    get: (key?: string) => Promise<any>;
}

declare class NetworkServer {
    private io;
    private host;
    private port;
    private maxTransferSize;
    private clients;
    name: string;
    isLan: boolean;
    connectionCallback: any;
    disconnectCallback: any;
    listeners: Listener[];
    httpServer?: http.Server;
    isReady: boolean;
    private ioOptions;
    constructor({ name, host, port, listeners }: {
        name: string;
        host: string;
        port: number;
        listeners: Listener[];
    }, options?: {
        maxTransferSize: number;
    });
    private handleConnection;
    private handleDisconnection;
    setListeners(listeners: Listener[]): void;
    broadcast(event: string, data: any): void;
    addListeners(listeners: Listener[]): void;
    getClient(id: string): Connection | null;
    getClients(): Connection[];
    onConnection(callback: any): void;
    onDisconnect(callback: any): void;
    getListeners(): any[];
    close(): Promise<void>;
}

declare class Network {
    id: string;
    server: NetworkServer | null;
    name: string;
    private listeners;
    connections: Pool<Connection>;
    serviceConnectionCallback?: Function;
    serviceDisconnectCallback?: Function;
    newListenersCallback?: Function;
    constructor({ name, id }: {
        name?: string;
        id?: string;
    });
    connect({ name, host, port, as }: {
        name?: string;
        host: string;
        port: number;
        as?: string;
    }): Promise<Connection>;
    connectAll(services: {
        name: string;
        host: string;
        port: number;
    }[]): Promise<never[] | Connection[]>;
    createServer(name: string, host: string, port: number, listeners?: Listener[]): void;
    close(): void;
    getService(name: string): Connection;
    getServices(): Connection[];
    getNode(id: string): Connection;
    getNodes(): Connection[];
    getConnections(): Connection[];
    closeService(name: string): void;
    closeConnection(id: string): void;
    registerListeners(listeners: Listener[]): void;
    addListeners(listeners: Listener[]): void;
    getRegisteredListeners(): any;
    onNodeConnection(callback: (connection: Connection) => void): void;
    onNodeDisconnect(callback: (connection: Connection) => void): void;
    onServiceConnection(callback: (connection: Connection) => void): void;
    onServiceDisconnect(callback: (connection: Connection) => void): void;
    onNewListeners(callback: (listeners: Listener[]) => void): void;
}

type ServiceAddress = {
    name: string;
    host?: string;
    port?: number;
};

type NodeStatus = 'idle' | 'working' | 'error';
declare class Node {
    mode: 'client' | 'server' | undefined;
    id: string | undefined;
    status: NodeStatus;
    listeners: Listener[];
    lastUpdateAt: number;
    network: Network | undefined;
    servicesConnected: boolean;
    statusChangeCallback: ((status: NodeStatus, node: Node) => void) | null;
    stashSetFunction: (({ key, value }: {
        key: string;
        value: any;
    }) => any) | null;
    stashGetFunction: ((key: string) => any) | null;
    services: ServiceAddress[];
    doneMethods: {
        [key: string]: boolean;
    };
    methods: {
        [key: string]: (parameter?: any, self?: Node) => any;
    };
    constructor();
    getId: () => string | undefined;
    getStatus: () => NodeStatus;
    lastHeardOfIn: () => number;
    isIdle: () => boolean;
    isWorking: () => boolean;
    isError: () => boolean;
    private updateLastHeardOf;
    private updateStatus;
    untilFinish: () => Promise<boolean>;
    run: (method: string, parameter: any) => Promise<any>;
    exec: (method: string, code: string) => Promise<any>;
    setServices: (services: ServiceAddress[]) => Promise<any>;
    exit: () => Promise<any>;
    ping: () => Promise<boolean>;
    setNodeConnection(connection: Connection, network: Network): void;
    setStatusChangeCallback(callback: (status: NodeStatus, node: Node) => void): void;
    setStashFunctions({ set, get }: {
        set: (key: string, value: any) => any;
        get: (key: string) => any;
    }): void;
    handleStatusChange(status: NodeStatus): void;
    lastHeardOf(): number;
    private run_server;
    private exec_server;
    private setServices_server;
    ping_server(): Promise<boolean>;
    exit_server(): Promise<any>;
    registerServices(service: ServiceAddress[]): Promise<unknown[]>;
    send(method: string, parameter?: any): Promise<any>;
    connectToMaster(host: string, port: number): Promise<void>;
    private run_client;
    private exec_client;
    _startup(): Promise<void>;
    setStash: (key: any, value?: any) => Promise<any>;
    getStash: (key?: string) => Promise<any>;
    addMethods(methods: {
        [key: string]: (parameter: any) => any;
    }): void;
    private setServices_client;
    connectService({ name, host, port }: ServiceAddress): Promise<Connection>;
    private ping_client;
    private exit_client;
    getListeners(): any[];
    hasDone(method: string): boolean;
    isBusy: () => boolean;
    hasFinished: (method: string) => boolean;
    hasError: () => boolean;
    toFinish: () => Promise<boolean>;
    set: (key: any, value?: any) => Promise<any>;
    get: (key?: string) => Promise<any>;
    stash: (key: any, value?: any) => Promise<any>;
    unstash: (key?: string) => Promise<any>;
}

export { Node, PeerDicoveryServer as PeerDiscoverer, Service, entry as default };
