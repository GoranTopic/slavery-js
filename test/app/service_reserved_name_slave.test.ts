import Service from '../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

/*
 * This test verifies that a service named 'service_slave' cannot be created.
 * The name 'service_slave' is reserved because it is injected into the slave callback.
 * Same format as service_reserved_name_master.test.ts in test/service/.
 */

expect(() => {
    new Service({
        service_name: 'service_slave',
        peerServicesAddresses: [],
        mastercallback: async () => {},
        options: {
            host: 'localhost',
            port: 3003,
        }
    });
}).to.throw("Service name 'service_slave' is reserved and cannot be used");

console.log(`[${process.argv[1].split('/').pop()}] ✅ service named 'service_slave' correctly fails to be created`);
