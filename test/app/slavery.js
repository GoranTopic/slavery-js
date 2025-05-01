import slavery from '../../src/index'
import { expect } from 'chai'

let wait_function = async s => await new Promise(r => setTimeout(() => r(s), s * 1000))

slavery({
    host: 'localhost',
    port: '3000'
}).logger({
    'log': mesg => console.log(mesg)
}).waiter({
    wait: async s => {
        console.log('waiting for', s)
        await wait_function(s)
        return s
    },
}).master( async ({ waiter, logger }) => {
    console.log(`[${process.argv[1].split('/').pop()}] testing the slavery api`)
    let result = await waiter.wait(1)
    await logger.log('master')
    expect(result).to.equal(1)
    console.log(`[${process.argv[1].split('/').pop()}] ✅ test passed`)
    await waiter.exit()
    await logger.exit()
})



