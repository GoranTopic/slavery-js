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
        console.log(`[${process.argv[1].split('/').pop()}] starting test, to select and control a single node`)
        // select a single node
        let node1 = await awaiter.select(1)
        let node2 = await awaiter.select(1)
        await node1.setup()
        let res = await node1.wait(3)
        expect(res).to.equal('waited for 3 seconds, 😐')
        /*
        try {
            await node2.wait(3)
        } catch (e) {
            console.error(e)
            expect(e).to.equal('Node is busy')
        }
        */
        console.log(`[${process.argv[1].split('/').pop()}] ✅ concurrent test passed`)
        // this will send a signal to exit every node and every service
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
        'setup': async ({}, {slave}) => {
            slave.wait = async (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000))
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
