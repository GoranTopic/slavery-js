type Request = {
    /* this it he request made to the service by other services */
    method: string;
    parameters: any;
    completed: boolean;
    result: any;
};

export default Request;
