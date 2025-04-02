import { expect } from 'chai'
import Service from '../../src/service'
import PeerDiscovery from '../../src/peerDiscovery'
import { log, isServerActive } from '../../src/utils'
process.env.debug = 'false';

/* *
 * This test will check if the peer discovery work correcly
 * */

// lets make a peer disvoery service
let peer_discovery = new PeerDiscovery({
    host: 'localhost',
    port: 3005,
})
peer_discovery.start()


let test_service = new Service({
    service_name: 'tester', // service discovery service
    peerDiscoveryAddress: { host: 'localhost', port: 3005 },
    mastercallback: async (services) => {
        console.log(`[${process.argv[1].split('/').pop()}] start the test which will try to detect a service`)
        let is_active = await isServerActive({ host: 'localhost', port: 3005 })
        // expect to be false
        expect(is_active).to.be.true
        // check the connection to every service fo type Service
        for ( let service of Object.values(services) ) {
            if(service === undefined) continue
            //@ts-ignore
            if(service.name == 'tester') continue
            //@ts-ignore
            expect(await service.test()).to.be.equal('test')
            //@ts-ignore exit
            await service.exit()
        }
        console.log(`[${process.argv[1].split('/').pop()}] ✅ service detection is working`)
        await services['self'].exit()
    }
})
test_service.start()

for (let i = 0; i < 50; i++) {
    let service = new Service({
        service_name: `service${i}`,
        peerDiscoveryAddress: { host: 'localhost', port: 3005 },
        slaveMethods: {
            test: async () => 'test'
        }
    })
    service.start()
}

