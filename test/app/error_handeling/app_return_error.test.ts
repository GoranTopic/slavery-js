import { expect } from 'chai'
import entry from '../../../src/app'
process.env.debug = 'false';

/*
 * This test checks that the app API forwards the error as a return value
 * to the service that is requesting the process when onError is 'return'.
 */

entry({
    host: 'localhost',
    port: 5020,
})
//@ts-expect-error - this is a test
.errorer({
    throw_error: async (x) => {
            return x.toLowerCase(); // TypeError when x is a number (e.g. 2)
        }
}, { number_of_nodes: 1 })
.error_test(async ({ errorer, self }) => {
    let result = await errorer.throw_error(2)
    expect(result).to.be.an.instanceof(Error)
    console.log(`[${process.argv[1].split('/').pop()}] ✅ Error object was returned`)
    await errorer.exit()
    await self.exit()
}, { onError: 'return' })
