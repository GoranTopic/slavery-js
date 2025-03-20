import Service from '../../src/service'
import { expect } from 'chai'
import { performance } from 'perf_hooks'
import { log } from '../../src/utils'
process.env.debug = 'false';

/*
 * This test will create three services, one will be the test service while the other
 * will be the awaiter service, which represents the processing and
 * and the logger service which will log the results of the processing
 */


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'logger', host: 'localhost', port: 3004 }
    ],
    mastercallback: async ({ awaiter, logger, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test to see if the services can comunucate with each other`)
        let start = performance.now();
        await Promise
        .all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
             .map( async (i) => {
                 await awaiter.wait(i)
                 .then( async (res:any) => await logger.log(res) )
             })
            )
            let end = performance.now()
            let seconds = Math.round((end - start) / 1000)
            await logger.log(`total time: ${end - start} ms`)
            expect(seconds).to.be.lessThan(15)
            if( seconds > 15 )
                console.log(`[${process.argv[1].split('/').pop()}] ❌ service communication test failed, took: ${seconds} seconds`)
            else
                console.log(`[${process.argv[1].split('/').pop()}] ✅ service communication test passed, took: ${seconds} seconds`)
            await awaiter.exit()
            await logger.exit()
            await self.exit()
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
        'wait': async (wating_time: number) => {
            let wait_function =
                (s: number) : Promise<number> => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
            // count sum of numbers
            let s = await wait_function(wating_time)
            // run some code
            if( s > 7 ) return `waited for ${s} seconds, 😡`
            else if( s > 5 ) return `waited for ${s} seconds, 😐`
            else if( s > 2  ) return `waited for ${s} seconds, 😃`
            else return `waited for ${s} seconds, 😄`
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
            log('form ' + message);
        }
    },
    options: {
        host: 'localhost',
        port: 3004,
    }
})
logger_service.start()

