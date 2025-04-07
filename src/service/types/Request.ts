type Request = {
    /* this it he request made to the service by other services */
    type: 'run' | 'exec';
    method: string;
    parameters: any;
    selector?: string; // used to select specific node
    completed: boolean;
    result: any;
};

export default Request;
