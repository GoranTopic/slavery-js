import PeerDiscovery from '../../../src/app/peerDiscovery'
process.env.debug = 'false';

/* *
 * This test will check if the peer double start is working
 * */

// lets make a peer disvoery service
let peer_discovery1 = new PeerDiscovery({
    host: 'localhost',
    port: 3005,
})

// lets make a peer disvoery service
let peer_discovery2 = new PeerDiscovery({
    host: 'localhost',
    port: 3005,
})

let peer_discovery3 = new PeerDiscovery({
    host: 'localhost',
    port: 3005,
})

peer_discovery1.start()
peer_discovery2.start()
peer_discovery3.start()
