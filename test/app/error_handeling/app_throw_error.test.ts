import { expect } from 'chai'
import entry from '../../../src/app'
process.env.debug = 'false';

/*
 * This test checks that the app API forwards errors to the service that
 * is requesting the process when onError is 'throw'.
 */

entry({
    host: 'localhost',
    port: 5010,
})
    //@ts-expect-error - this is a test
    .errorer({
        throw_error: async (x) => {
            return x.toLowerCase(); // TypeError when x is a number (e.g. 2)
        }
    }, { number_of_nodes: 1 })
    .error_test(async ({ errorer, self }) => {
        await errorer.throw_error(2)
            .then((result: any) => {
                console.log('result: ' + result)
            }).catch((err: Error) => {
                expect(err).to.be.an.instanceof(Error)
                console.log(`[${process.argv[1].split('/').pop()}] ✅ Error was thrown and caught successfully`)
            });
        await errorer.exit()
        await self.exit()
    }, { onError: 'throw' })
