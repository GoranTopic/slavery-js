import Service from '../../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

// this test will check if the service can automaticaly scale down
// based on the demand of the service, the service will start many nodes,
// as he get fewer and fewer requests then the nodes should scale down


const wait = async (seconds: number) => new Promise( r => setTimeout( () => r(1), seconds * 1000) )

const time_to_wait = 2
const starting_nodes = 10
const percentage_to_scale_down = 0.9
const node_count_grace_error = 2

let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [ 
        { name: 'awaiter', host: 'localhost', port: 3003 } 
    ], 
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing if the service can auto scale down`);
        // wait for the nodes to initialize
        await awaiter._number_of_nodes_connected(starting_nodes - node_count_grace_error);
        let first_slave_count = await awaiter._get_nodes_count();
        expect(first_slave_count).to.be.greaterThanOrEqual(starting_nodes - node_count_grace_error);
        // wait for the nodes to initialize
        for (let i = 0; i < 10; i++) awaiter.wait(time_to_wait)
        // wait for some time, 3 seconds until the nodes are scaled down
        await wait(10)
        // get the number of slaves again
        let second_slave_count = await awaiter._get_nodes_count()
        expect(second_slave_count).to.be.lessThan(first_slave_count * percentage_to_scale_down)
        console.log(`[${process.argv[1].split('/').pop()}] ✅ service was able to auto scale down by at least ${percentage_to_scale_down * 100}%`)
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
        number_of_nodes: starting_nodes,
        auto_scale: true,
    }
})
awaiter_service.start()
