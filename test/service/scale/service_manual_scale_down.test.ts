import Service from '../../../src/service'
import { log } from '../../../src/utils'
import { expect } from 'chai'
process.env.debug = 'false';

// this test will check if the service can be manualy scaled down,

const wait = async (time: number) => 
    new Promise( r => setTimeout( () => r(1), time * 1000) )


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing with manual downscale`)
        await new Promise( r => setTimeout( () => r(1), 1 * 1000) )
        // get the number of slaves
        let slave_count = await awaiter._get_nodes_count()
        log('slave count:', slave_count)
        expect(slave_count).to.be.equal(20)
        // ask the awaiter service to kill one node
        log('killing a node');
        await awaiter._kill_node()
        await wait(1)
        // get the number of slaves again and check for the changes
        let second_slave_count = await awaiter._get_nodes_count()
        log('slave count:', second_slave_count)
        expect(second_slave_count).to.be.equal(19)
        // add kill more
        await awaiter._kill_node(12)
        await wait(1)
        // get the number of slaves again
        let third_slave_count = await awaiter._get_nodes_count()
        log('slave count:', third_slave_count)
        expect(third_slave_count).to.be.equal(7)
        await awaiter._kill_node(7)
        await wait(1)
        // get the number
        let fourth_slave_count = await awaiter._get_nodes_count()
        log('slave count:', fourth_slave_count)
        expect(fourth_slave_count).to.be.equal(0)
        // pass test
        console.log(`[${process.argv[1].split('/').pop()}] ✅ test passed`)
        await awaiter.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
        auto_scale: false,
    }
})
test_service.start()


let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [
        { name: 'test', host: 'localhost', port: 3002 }
    ],
    slaveMethods: {
        'wait': async () => await new Promise( r => { setTimeout( () => { r(1) }, 1 * 1000) })
    },
    options: {
        host: 'localhost',
        port: 3003,
        // assumes that when you set the number of nodes then the 
        number_of_nodes: 20,
    }
})
awaiter_service.start()
