import { expect } from 'chai'
import Service from '../../../src/service'
process.env.debug = 'false';

/* *
 * This test will create a service which will attempt to select a single node
 * from the service, it communcates with it directly 
 * */

let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'awaiter', host: 'localhost', port: 3003 },
    ],
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test, to select and control a single nodes`)
        await awaiter._number_of_nodes_connected(3);
        // select a single node
        let node = await awaiter.select(1);
        const node_id = await node.getId();
        let id = await node.getId();
        expect(id).to.equal(node_id);
        // make a simple request
        let res = await node.setup();
        expect(res).to.equal('setup done, id: ' + node_id)
        // make a simple request
        res = await node.wait(3)
        expect(res).to.equal('waited for 3 seconds, 😐, id: ' + node_id)
        // pass test
        console.log(`[${process.argv[1].split('/').pop()}] ✅ control of single and multiple nodes passed`)
        // close the node
        await awaiter.exit();
        await self.exit();
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
    ],
    slaveMethods: {
        'getId': async (params, {self}) => {
            return self.id;
        },
        'setup': async (params, {slave}) => {
            slave.wait = async (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000))
            return 'setup done, id: ' + slave.id
        },
        'wait': async (wating_time: number, { slave }) => {
            let s = await slave.wait(wating_time)
            return 'waited for ' + s + ' seconds, 😐, id: ' + slave.id
           
        },
        'close': async ({}, {slave}) => slave['wait'] = undefined
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 3,
        auto_scale: false
    }
})
awaiter_service.start()
