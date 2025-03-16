import { expect } from 'chai'
import Service from '../../src/service'
import { log } from '../../src/utils'
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
    mastercallback: async ({ awaiter, logger, master }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test, node communication with a service`)
        let start = performance.now();
        await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ].map(
            async (i) => await awaiter.wait(i).then( (res: any) => expect(res.error).to.be.undefined)
        ))
        let end = performance.now()
        let seconds = Math.round((end - start) / 10) / 100
        if( seconds > 15 )
            console.log(`[${process.argv[1].split('/').pop()}] ❌ concurrent test failed, took: ${seconds} seconds`)
        else
            console.log(`[${process.argv[1].split('/').pop()}] ✅ concurrent test passed, took: ${seconds} seconds`)
        // this will send a signal to exit every node and every service
        await awaiter.exit();
        await logger.exit();
        await master.exit();
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
        'wait': async (wating_time: number, { logger }) => {
            let wait_function =
                (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000))
            // run some code
            let s = await wait_function(wating_time)
            if( s > 7 )
                await logger.log(`waited for ${s} seconds, 😡`)
            else if( s > 5 )
                await logger.log(`waited for ${s} seconds, 😢`)
            else if( s > 2  )
                await logger.log(`waited for ${s} seconds, 😐`)
            else
                await logger.log(`waited for ${s} seconds, 😄`)
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
        'log': async (message: string) => {
            expect(message).to.be.a('string')
            log('form logger service: ' + message);
        }
    },
    options: {
        host: 'localhost',
        port: 3004,
    }
})
logger_service.start()
