import Service from '../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

/*
 * This test verifies that a service named 'service_master' cannot be created.
 * The name 'service_master' is reserved because it is injected into the master callback.
 */

expect(() => {
    new Service({
        service_name: 'service_master',
        peerServicesAddresses: [],
        mastercallback: async () => {},
        options: {
            host: 'localhost',
            port: 3002,
        }
    });
}).to.throw("Service name 'service_master' is reserved and cannot be used");

console.log(`[${process.argv[1].split('/').pop()}] ✅ service named 'service_master' correctly fails to be created`);
