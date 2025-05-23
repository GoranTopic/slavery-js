import { expect } from 'chai'
import Service from '../../../src/service'
process.env.debug = 'false';

/*
 * this test will see if the we are fowarding the error to the the service that
 * is requesting the processos */

let test_service = new Service({
    service_name: 'error_test',
    peerServicesAddresses: [
        { name: 'errorer', host: 'localhost', port: 3003 }
    ],
    mastercallback: async ({ errorer, self }) => {
        await errorer.throw_error()
        .catch((err: Error) => {
            expect(err).to.be.an.instanceof(Error)
            expect(err.message).to.equal('this is an error')
            console.log(`[${process.argv[1].split('/').pop()}] ✅ Error was thrown and caught successfully`)
        });
        await errorer.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
        throwError: true,
        returnError: false,
        logError: false,
    }
})
test_service.start()

// this is the service we will use to throw an error
let error_service = new Service({
    service_name: 'errorer',
    peerServicesAddresses: [],
    slaveMethods: {
        'throw_error': async () => { throw new Error('this is an error') }
    }, // the methods that the slaves will
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 4,
    }
});
error_service.start();
