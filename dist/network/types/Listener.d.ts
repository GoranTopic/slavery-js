interface Listener {
    event: string;
    parameters?: Array<any>;
    callback: Function;
}

export type { Listener as default };
