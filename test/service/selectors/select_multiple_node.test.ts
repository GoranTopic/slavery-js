import { expect } from 'chai'
import Service from '../../../src/service'
process.env.debug = 'false';

/* *
 * This test will create a service which will attempt to select a multiple nodes 
 * from the service, it communcates with it directly 
 * */


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'awaiter', host: 'localhost', port: 3003 },
    ],
    mastercallback: async ({ awaiter, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test, to select and control a single, or multiple nodes`)
        await awaiter._number_of_nodes_connected(9);
        // select a single node
        let three_nodes = await awaiter.select(3);
        let [ id1, id2, id3 ] = await three_nodes.getId()
        // select all nodes 
        let four_nodes = await awaiter.select(4);
        let [ id4, id5, id6, id7 ] = await four_nodes.getId()
        let nodes = await awaiter.select('all'); // all nodes
        let all_ids = await nodes.getId()
        // expect the ids to be different
        for (let id of all_ids) // expect the id to be unique
            expect(all_ids.filter((i: string) => i === id).length).to.equal(1)
        // make a simple request
        let responces = await nodes.setup()
        expect(responces).to.have.length(9)
        // check the all 3 reponses
        responces = await three_nodes.wait(1)
        expect(responces).to.have.length(3)
        expect(responces[0]).to.equal('waited for 1 seconds, 😄 ' + id1)
        expect(responces[1]).to.equal('waited for 1 seconds, 😄 ' + id2)
        expect(responces[2]).to.equal('waited for 1 seconds, 😄 ' + id3)
        // check the all 4 reponses
        responces = await four_nodes.wait(1)
        expect(responces).to.have.length(4)
        expect(responces[0]).to.equal('waited for 1 seconds, 😄 ' + id4)
        expect(responces[1]).to.equal('waited for 1 seconds, 😄 ' + id5)
        expect(responces[2]).to.equal('waited for 1 seconds, 😄 ' + id6)
        expect(responces[3]).to.equal('waited for 1 seconds, 😄 ' + id7)
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
        'getId': (params, {slave}) => { return slave.id },
        'setup': async (params, {slave}) => {
            slave.wait = async (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000))
            return 'setup done ' + slave.id;
        },
        'wait': async (wating_time: number, { slave }) => {
            let s = await slave.wait(wating_time)
            return `waited for ${s} seconds, 😄 ` + slave.id;
        },
        'close': async ({}, {slave}) => { return slave['wait'] = undefined },
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
        auto_scale: false
    }
})
awaiter_service.start()
