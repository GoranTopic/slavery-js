import Service from '../../../src/service'
import { expect } from 'chai'
import { log } from '../../../src/utils'
import { performance } from 'perf_hooks'
process.env.debug = 'false';

// this test will check if the service can automaticaly scale up 
// based on the demand of the service, the service will start with simple request,
// they give more and more while checking if the service is adding more nodes


let test_service = new Service({
    service_name: 'multi_service_test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        // check the number of slave awaiter has
        let first_slave_count = await awaiter._get_nodes_count()
        console.log('[test][master] first slave count: ', first_slave_count)
        // set inteval for asking the awaiter 
        setInterval( async () => await awaiter.wait(1).then( (res:any) => expect(res).to.equal(1) ), 10)
        // wait for some time, 3 seconds
        await new Promise( r => setTimeout( () => r(1), 3 * 1000) )
        // get the number of slaves again
        let second_slave_count = await awaiter._get_nodes_count()
        console.log('[test][master] second slave count: ', second_slave_count)
        /*
        console.log('[test][master] second slave count: ', second_slave_count)
        else console.log('✅ concurrent test passed, took: ', seconds, 'seconds');
        console.log('[test][master] test ended, service exiting all the nodes');
        */
        //await awaiter.exit()
        //await self.exit()
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
        { name: 'multi_service_test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'wait': async () => await new Promise( r => { setTimeout( () => { r(1) }, 1 * 1000) })
    },
    options: {
        host: 'localhost',
        port: 3003,
        auto_scale: true,
    }
})
awaiter_service.start()
