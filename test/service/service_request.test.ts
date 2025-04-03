import Service from '../../src/service'
import { expect } from 'chai'
import { log } from '../../src/utils'
import { performance } from 'perf_hooks'
process.env.debug = 'false';

// This test will create two service with fixed ip (localhost) and port,
// they will try to comunicate with each other such that one will send 
// a query to run to the other one and expect the correct a response


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test to see if if a service and respond to multiple requests concurrently`);
        let start = performance.now();
        await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ].map(
            async (i) => {
                await awaiter.wait(i)
                .then(
                    (res:any) => expect(res).to.be.oneOf([
                        `waited for ${i} seconds, 😄`, 
                        `waited for ${i} seconds, 😃`,
                        `waited for ${i} seconds, 😐`,
                        `waited for ${i} seconds, 😡`
                    ])
                )
            })
        )
        let end = performance.now()
        let seconds = (end - start) / 1000
        log(`[test][master] total time: ${end - start} ms`)
        expect(seconds).to.be.lessThan(15)
        expect(seconds).to.be.greaterThan(9)
        console.log(`[${process.argv[1].split('/').pop()}] ✅ the sevice can respond to multiple requests, it took ${seconds} seconds`);
        // exit
        await awaiter.exit()
        await self.exit()
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
        { name: 'tester', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'setup': (params: any , { slave }) => {
            // function to count sum of numbers, purely for the porpuse of processing
            let wait_function = (s: number) => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
            slave['wait_function'] = wait_function 
            log(`[test][slave][slave ${slave.id}] was setup`);
            return true;
        }, 
        'wait': async (wating_time: number, { slave }) => {
            // count sum of numbers
            let s = await slave['wait_function'](wating_time)
            // run some code
            if( s > 7 ) return `waited for ${s} seconds, 😡`
            else if( s > 5 ) return `waited for ${s} seconds, 😐`
            else if( s > 2  ) return `waited for ${s} seconds, 😃` 
            else return `waited for ${s} seconds, 😄`
        }, 
        'clean up': async (params: any, salve: any) => delete salve['wait_function']
        
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
})
awaiter_service.start()
