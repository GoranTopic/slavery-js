import Service from '../src/service'
import { performance } from 'perf_hooks'
process.env.debug = 'false';

/*
   This test will create three services, one will be the test service while the other
   will be the awaiter service, which represents the processing and
   and the logger service which will log the results of the processing
   */


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'logger', host: 'localhost', port: 3004 }
    ],
    mastercallback: async ({ awaiter, logger }) => {
        let start = performance.now();
        await Promise
        .all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
             .map( async (i) => {
                 await awaiter.wait(i)
                 .then( async (res:any) => await logger.log(res.result) )
             })
            )
            let end = performance.now()
            let seconds = (end - start) / 1000
            await logger.log(`total time: ${end - start} ms`)
            if( seconds > 15 )
                await logger.log('❌ concurrent test failed, took: ' + seconds + ' seconds');
            else
                await logger.log('✅ concurrent test passed, took: ' + seconds + ' seconds');
            await logger.log('test ended, service exiting all the nodes');
            // to exit the master process you need to call process.exit(0) fromt his fuction
            // at least that is what I think is happening...
            process.exit(0);
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
test_service.start()


let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [
        { name: 'test', host: 'localhost', port: 3002 },
        { name: 'logger', host: 'localhost', port: 3004 }
    ],
    slaveMethods: {
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
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
})
awaiter_service.start()

let logger_service = new Service({
    service_name: 'logger',
    peerServicesAddresses: [
        { name: 'test', host: 'localhost', port: 3002 },
        { name: 'awaiter', host: 'localhost', port: 3003 }
    ],
    slaveMethods: {
        'log': async (message: string, slave: any) => {
            console.log('form logger service: ' + message);
        }
    },
    options: {
        host: 'localhost',
        port: 3004,
    }
})
logger_service.start()

