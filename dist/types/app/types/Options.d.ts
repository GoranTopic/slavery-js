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
export default Options;
