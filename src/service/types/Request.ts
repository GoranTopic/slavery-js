type Request = {
    /* this it he request made to the service by other services */
    method: string;
    parameters: any;
    selector?: string; // used to select specific node
    completed: boolean;
    result: any;
};

export default Request;
