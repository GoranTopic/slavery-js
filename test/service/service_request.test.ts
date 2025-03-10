import Service from '../src/service'
import { performance } from 'perf_hooks'
process.env.debug = 'false';

// This test will create two service with fixed ip (localhost) and port,
// they will try to comunicate with each other such that one will send 
// a query to run to the other one and expect the correct a response


let main_service = new Service({
    service_name: 'multi_service_test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter }) => {
        let start = performance.now();
        await Promise
        .all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
             .map( async (i) => {
                 await awaiter.wait(i)
                 .then( (res:any) => console.log('response: ', res.result) )
             })
            )
            let end = performance.now()
            let seconds = (end - start) / 1000
            console.log(`[test][master] total time: ${end - start} ms`)
            if( seconds > 15 ) console.log('❌ concurrent test failed, took: ', seconds, 'seconds');
            else console.log('✅ concurrent test passed, took: ', seconds, 'seconds');
            console.log('[test][master] test ended, service exiting all the nodes');
            // to exit the master process you need to call process.exit(0) fromt his fuction
            // at least that is what I think is happening...
            process.exit(0);
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
main_service.start()


//process.env.debug = 'false'
let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [
        { name: 'multi_service_test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'setup': (params: any , slave: any) => {
            // function to count sum of numbers, purely for the porpuse of processing
            let wait_function = 
                (s: number) => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
            slave['wait_function'] = wait_function 
            console.log(`[test][slave][slave ${slave.id}] was setup`);
            return true;
        }, 
        'wait': async (wating_time: number, slave: any) => {
            let wait_function = 
                (s: number) : Promise<number> => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
            // count sum of numbers
            let s = await wait_function(wating_time)
            // run some code
            if( s > 7 )
                return `waited for ${s} seconds, 😡`
            else if( s > 5 )
                return `waited for ${s} seconds, 😐`
            else if( s > 2  )
                return `waited for ${s} seconds, 😃` 
            else
                return `waited for ${s} seconds, 😄`
        }, 
        'clean up': async (params: any, salve: any) => {
            salve['wait_function'] = undefined
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
})
awaiter_service.start()
