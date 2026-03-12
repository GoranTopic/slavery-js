import entry from '../../../src/app'
process.env.debug = 'false';

/*
 * This test checks that the app API logs the error when onError is 'log'
 * and the requesting service continues without throwing.
 */

entry({
    host: 'localhost',
    port: 5030,
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
    })
    console.log(`[${process.argv[1].split('/').pop()}] ✅ if you see an error above this line, the test passed`)
    await errorer.exit()
    await self.exit()
}, { onError: 'log' })
