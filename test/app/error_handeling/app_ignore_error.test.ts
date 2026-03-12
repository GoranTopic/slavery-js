import { expect } from 'chai'
import entry from '../../../src/app'
process.env.debug = 'false';

/*
 * This test checks that the app API returns null and ignores the error
 * when onError is 'ignore'.
 */

entry({
    host: 'localhost',
    port: 5040,
})
//@ts-expect-error - this is a test
.errorer({
    throw_error: async (x) => {
        return x.toLowerCase(); // TypeError when x is a number (e.g. 2)
    }
}, { number_of_nodes: 1 })
.error_test(async ({ errorer, self }) => {
    let result = await errorer.throw_error(2)
    expect(result).to.be.null
    console.log(`[${process.argv[1].split('/').pop()}] ✅ Error was ignored, null returned`)
    await errorer.exit()
    await self.exit()
}, { onError: 'ignore' })
