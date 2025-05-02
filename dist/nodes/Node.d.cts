import Network from '../network/Network.cjs';
import Connection from '../network/Connection.cjs';
import Listener from '../network/types/Listener.cjs';
import ServiceAddress from './types/ServiceAddress.cjs';
import '../utils/Pool.cjs';
import '../network/Server.cjs';
import 'http';
import 'socket.io';

type NodeStatus = 'idle' | 'working' | 'error';
declare class Node {
    mode: 'client' | 'server' | undefined;
    id: string | undefined;
    status: NodeStatus;
    listeners: Listener[];
    lastUpdateAt: number;
    network: Network | undefined;
    servicesConnected: boolean;
    hasStartupFinished: boolean;
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
    constructor(input?: {
        methods?: Record<string, (parameter: any) => any>;
    });
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
    send(method: string, parameter?: any): Promise<any>;
    connectToMaster(host: string, port: number): Promise<void>;
    private run_client;
    private exec_client;
    private run_startup;
    private get_services;
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

export { Node as default };
