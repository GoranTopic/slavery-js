import Service from '../../../src/service'
//import { performance } from 'perf_hooks'
process.env.debug = 'false';

/*
 * this test will see if the we are fowarding the error to the the service that
 * is requesting the processos */

let test_service = new Service({
    service_name: 'error_test',
    peerServicesAddresses: [
        { name: 'errorer', host: 'localhost', port: 3003 }
    ],
    mastercallback: async ({ errorer }) => {
        let result = await errorer.throw_error()
        // if the result is and error pass the test
        if(result instanceof Error){
            console.log('return error test passed')
        }
    },
    options: {
        host: 'localhost',
        port: 3002,
        throwError: false,
        returnError: true,
        logError: false,
    }
})
test_service.start()

// this is the service we will use to throw an error
let error_service = new Service({
    service_name: 'errorer',
    peerServicesAddresses: [],
    slaveMethods: {
        'throw_error': async () => {
            throw new Error('this is an error');
        }
    }, // the methods that the slaves will
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 4,
    }
});
error_service.start();
