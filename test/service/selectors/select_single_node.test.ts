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
        console.log(`[${process.argv[1].split('/').pop()}] starting test, to select and control a single, or multiple nodes`)
        await awaiter._number_of_nodes_connected(3);
        // select a single node
        let node = await awaiter.select(1)
        // make a simple request
        let [ res ] = await node.setup()
        expect(res).to.equal('setup done')
        // select all nodes 
        let nodes = await awaiter.select()
        // make a simple request
        let responces = await nodes.setup(3)
        expect(responces).to.have.length(3)
        // check the all 3 reponses
        expect(responces[0]).to.equal('setup done')
        expect(responces[1]).to.equal('setup done')
        expect(responces[2]).to.equal('setup done')
        responces = await nodes.wait(3)
        expect(responces).to.have.length(3)
        expect(responces[0]).to.equal('waited for 3 seconds, 😐')
        expect(responces[1]).to.equal('waited for 3 seconds, 😐')
        expect(responces[2]).to.equal('waited for 3 seconds, 😐')
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
        'setup': async (params, {slave}) => {
            slave.wait = async (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000))
            return 'setup done'
        },
        'wait': async (wating_time: number, { slave }) => {
            let s = await slave.wait(wating_time)
            if( s > 7 )
                return `waited for ${s} seconds, 😡`
            else if( s > 5 )
                return `waited for ${s} seconds, 😢`
            else if( s > 2  )
                return `waited for ${s} seconds, 😐`
            else
                return `waited for ${s} seconds, 😄`
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
