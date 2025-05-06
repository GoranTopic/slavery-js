type Options = {
    host?: string,
    port?: number,
    nm_host?: string,
    nm_port?: number,
    //  max number of request before making more nodes
    max_queued_requests?: number,
    // fixed number of processes
    number_of_nodes?: number,
    max_number_of_nodes?: number,
    min_number_of_nodes?: number,
    // the number of request that have to be in queue before increasing the number of processes
    increase_processes_at_requests?: number,
    // the number of node that have to be idle before decreasing the number of processes
    decrease_processes_at_idles?: number,
    // thow exception on error
    throwError?: boolean,
    returnError?: boolean,
    logError?: boolean,
    // auto scale based on length of Rquest Queue and the idle rate od nodes
    auto_scale?: boolean,
    // timeout for requests
    timeout?: number,
    // how to handle errors
    onError?: 'throw' | 'log' | 'ignore'
    
}

export default Options;
