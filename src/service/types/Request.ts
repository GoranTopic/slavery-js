type Request = {
    /* this it he request made to the service by other services */
    // this will be the type of request, run, to run a method, or exec to albitrary code
    id: number 
    type: 'run' | 'exec';  
    // this will be the method the request will run, when the type is run
    method: string; 
    parameters: any;
    selector?: string | undefined;
    completed: boolean;
    isProcessing: boolean;
    result: any;
    // callback to be called when the request is completed
    onComplete: () => any; // start time of the request
    startTime: number;
};

export default Request;
