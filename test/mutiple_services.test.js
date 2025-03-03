import Service from '../src/service';
import { performance } from 'perf_hooks';
process.env.debug = 'true';
// This test will create two service with fixed ip (localhost) and port,
// they will try to comunicate with each other such that one will send 
// a query to run to the other one and expect the correct a response
let main_service = new Service({
    service_name: 'multi_service_test',
    peerServicesAddresses: [
        { name: 'awaiter_service', host: 'localhost', port: 3003 }
    ],
    mastercallback: async ({ awaiter }) => {
        const list_of_waits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        let start = performance.now();
        for (let wait_time of list_of_waits) {
            let res = await awaiter.wait(wait_time);
            console.log(`response: ${res}`);
        }
        let end = performance.now();
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
});
main_service.start();
process.env.debug = 'false';
let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [
        { name: 'multi_service_test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'setup': (params, slave) => {
            // function to count sum of numbers, purely for the porpuse of processing
            let wait_function = (s) => new Promise(r => { setTimeout(() => { r(s); }, s * 1000); });
            slave['wait_function'] = wait_function;
            console.log(`[test][slave][slave ${slave.id}] was setup`);
            return true;
        },
        'wait': async (wating_time, slave) => {
            let wait_function = (s) => new Promise(r => { setTimeout(() => { r(s); }, s * 1000); });
            // count sum of numbers
            let s = await wait_function(wating_time);
            // run some code
            if (s > 7)
                return `waited for ${s} seconds, 😡`;
            else if (s > 5)
                return `waited for ${s} seconds, 😐`;
            else if (s > 2)
                return `waited for ${s} seconds, 😃`;
            else
                return `waited for ${s} seconds, 😄`;
        },
        'clean up': async (params, salve) => {
            salve['wait_function'] = undefined;
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
});
awaiter_service.start();
