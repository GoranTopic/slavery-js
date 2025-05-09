type EntryOptions = {
    host?: string;
    port?: number;
    timeout?: number;
    retries?: number;
    autoScale?: boolean;
    number_of_nodes?: number;
    max_number_of_nodes?: number;
    min_number_of_nodes?: number;
};
declare const entry: (entryOptions: EntryOptions) => ProxyConstructor;

export { entry as default };
