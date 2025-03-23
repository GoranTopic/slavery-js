import Service from '../../../src/service'
//import { expect } from 'chai'
//import { log } from '../../../src/utils'
//import { performance } from 'perf_hooks'
process.env.debug = 'false';

// this test will check if the service can automaticaly scale up 
// based on the demand of the service, the service will start with simple request,
// they give more and more while checking if the service is adding more nodes

const wait = async (seconds: number) => new Promise( r => setTimeout( () => r(1), seconds * 1000) )


const time_to_wait = 10
const next_request_interval = 1


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        // check the number of slave awaiter has
        let first_slave_count = await awaiter._get_nodes_count()
        console.log('[test][master] first slave count: ', first_slave_count)
        // set inteval for asking the awaiter 
        setInterval( () => {
            awaiter.wait(time_to_wait)
            console.log('[Master] Request made')
        }, next_request_interval * 1000 )
        // wait for some time, 3 seconds
        //await wait(3)
        // get the number of slaves again
        //let second_slave_count = await awaiter._get_nodes_count()
        //console.log('[test][master] second slave count: ', second_slave_count)
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
        { name: 'test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'wait': async (seconds: number) =>{
            console.log('[slave] waiting for ' + seconds)
            await wait(seconds)
            console.log('[slave] wating ended ' + seconds)
            return 
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        auto_scale: true,
        number_of_nodes: 1,
    }
})
awaiter_service.start()
