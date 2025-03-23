import Service from '../../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

// this test will check if the service can automaticaly scale up 
// based on the demand of the service, the service will start with simple request,
// they give more and more while checking if the service is adding more nodes


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing with manual up scaling works`)
        // ask the awaiter to create a new node
        await awaiter._add_node()
        // wait for some time, 3 seconds
        await awaiter._number_of_nodes_connected(2)
        // get the number of slaves again
        let second_slave_count = await awaiter._get_nodes_count()
        expect(second_slave_count).to.be.equal(2)
        // add more nodes
        await awaiter._add_node(30)
        // wait for some time, 3 seconds
        await awaiter._number_of_nodes_connected(32)
        // get the number of slaves again
        let third_slave_count = await awaiter._get_nodes_count()
        expect(third_slave_count).to.be.equal(32)
        // pass test
        console.log(`[${process.argv[1].split('/').pop()}] ✅ test passed`)
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
        'wait': async () => await new Promise( r => { setTimeout( () => { r(1) }, 1 * 1000) })
    },
    options: {
        host: 'localhost',
        port: 3003,
        auto_scale: false,
        number_of_nodes: 1,
    }
})
awaiter_service.start()
