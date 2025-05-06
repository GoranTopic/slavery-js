import Service from '../../src/service'
import { expect } from 'chai'
import { log } from '../../src/utils'
process.env.debug = 'false';

/*
 * This test will create three services, one will be the test service while the other
 * will be the awaiter service, which represents the processing and
 * and the logger service which will log the results of the processing
 */
let wait_function = (s: number) : Promise<number> => new Promise( r => setTimeout( () => r(s), s * 1000) )


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'waiter', host: 'localhost', port: 3003 },
    ],
    mastercallback: async ({ waiter, self }) => {
        console.log('[master] waiter', waiter)
        console.log(`[${process.argv[1].split('/').pop()}] testing the timeout function for service calls`)
            try {
                await waiter.wait();
            } catch (e) {
                expect(e).to.be.an('error')
                expect(e.message).to.be.equal('TimeoutError: The service did not respond in time')
            }
            await waiter.exit()
            await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
test_service.start()


let waiter_service = new Service({
    service_name: 'waiter',
    peerServicesAddresses: [
    ],
    slaveMethods: {
        'wait': async () => {
            // this function will wait forever
            await wait_function(100 * 60 * 60) // wait for 24 hours
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 1,
    }
})
waiter_service.start()

