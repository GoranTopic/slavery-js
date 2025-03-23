import Service from '../../../src/service'
import { expect } from 'chai'
//import { log } from '../../../src/utils'
process.env.debug = 'false';

// this test will check if the service can automaticaly scale up 
// based on the demand of the service, the service will start with simple request,
// they give more and more while checking if the service is adding more nodes

const wait = async (seconds: number) => new Promise( r => setTimeout( () => r(1), seconds * 1000) )


const time_to_wait = 2
const next_request_interval = 0.5
const percentage_to_scale_up = 0.9


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing the ability of the service to auto scale up`)
        // check the number of slave awaiter has
        let first_slave_count = await awaiter._get_nodes_count()
        // set inteval for asking the awaiter 
        let interval = setInterval( () => awaiter.wait(time_to_wait), next_request_interval * 1000 )
        // wait for some time, to let the service scale up
        await wait(10)
        // get the number of slaves again
        let second_slave_count = await awaiter._get_nodes_count()
        // check if the number of slaves has increased by at least the percentage_to_scale
        expect(second_slave_count).to.be.greaterThan(first_slave_count * (1 + percentage_to_scale_up))
        console.log(`[${process.argv[1].split('/').pop()}] ✅ service was able to scale up by at least ${percentage_to_scale_up * 100}%`)
        // clear the interval
        clearInterval(interval)
        await awaiter.exit()
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
        { name: 'test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'wait': async (seconds: number) => await wait(seconds)
    },
    options: {
        host: 'localhost',
        port: 3003,
        auto_scale: true,
        number_of_nodes: 1,
    }
})
awaiter_service.start()
