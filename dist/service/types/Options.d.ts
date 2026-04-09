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
    onError?: 'throw' | 'log' | 'ignore' | 'return';
    auto_scale?: boolean;
    timeout?: number;
};

export type { Options as default };
