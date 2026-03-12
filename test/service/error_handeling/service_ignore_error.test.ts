import { expect } from 'chai'
import Service from '../../../src/service'
process.env.debug = 'false';

/*
 * This test checks that the error is ignored and null is returned
 * when onError is 'ignore'.
 */

let test_service = new Service({
    service_name: 'error_test',
    peerServicesAddresses: [
        { name: 'errorer', host: 'localhost', port: 3005 }
    ],
    mastercallback: async ({ errorer, self }) => {
        let result = await errorer.throw_error()
        expect(result).to.be.null
        console.log(`[${process.argv[1].split('/').pop()}] ✅ Error was ignored, null returned`)
        await errorer.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3004,
        onError: 'ignore',
    }
})
test_service.start()

let error_service = new Service({
    service_name: 'errorer',
    peerServicesAddresses: [],
    slaveMethods: {
        'throw_error': async () => { throw new Error('this is an error') }
    },
    options: {
        host: 'localhost',
        port: 3005,
        number_of_nodes: 4,
    }
});
error_service.start();
