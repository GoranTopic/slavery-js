import Service from '../../src/service'
import { expect } from 'chai'
import { log } from '../../src/utils'
process.env.debug = 'false';

/* this will test will see if the */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing if the _startup function is called automatically`)
        let res = await awaiter.wait(2)
        expect(res).to.be.equal(2)
        console.log(`[${process.argv[1].split('/').pop()}] ✅ the _startup function was called`)
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
        '_startup': (params: any , { slave }) => {
            slave['wait_function'] = (s: number) => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
        },
        // will be called when the service is started
        'wait': async (wating_time: number, { slave }) => {
            // count sum of numbers
            return await slave['wait_function'](wating_time)
        }, 
        '_cleanup': async (params: any, salve: any) => {
            console.log(`[${process.argv[1].split('/').pop()}] ✅ the _cleanup function was called`)
            delete salve['wait_function']
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
    }
})
awaiter_service.start()
