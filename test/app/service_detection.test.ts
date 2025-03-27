import { expect } from 'chai'
import Service from '../../src/service'
import { log, isActive } from '../../src/utils'
process.env.debug = 'false';

/* *
   this test will test the abilty to accurald detect if the service discovery service is working
   * */


let test_service = new Service({
    service_name: 'sds', // service discovery service
    peerServicesAddresses: [
        { name: 'other_service', host: 'localhost', port: 3003 },
    ],
    mastercallback: async ({ other_service, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] start the test which will try to detect a service`)
        // await for 3 seconds
        let is_active = await isActive({ host: 'localhost', port: '3005' })
        // expect to be false
        expect(is_active).to.be.false
        // check if the service is active
        is_active = await isActive({ host: 'localhost', port: '3003' })
        // expect to be true
        expect(is_active).to.be.true
        // log the result
        console.log(`[${process.argv[1].split('/').pop()}] ✅ service detection is working`)
        await other_service.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
test_service.start()


let awaiter_service = new Service({
    service_name: 'other_service',
    peerServicesAddresses: [
        { name: 'sds', host: 'localhost', port: 3002 },
    ],
    options: {
        host: 'localhost',
        port: 3003,
    }
})
awaiter_service.start()
