type Options = {
    host?: string,
    port?: number,
    number_of_processes?: number,
    max_number_of_processes?: number,
    min_number_of_processes?: number,
    // the number of request that have to be in queue before increasing the number of processes
    increase_processes_at_requests?: number,
    // the number of node that have to be idle before decreasing the number of processes
    decrease_processes_at_idles?: number,
}

export default Options;
