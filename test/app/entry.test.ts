import { expect } from 'chai'
import entry from '../../src/app'
import { log } from '../../src/utils'
process.env.debug = 'false';

/* *
 * This test will if everything from the entry point back is running correctly,
 * cross your fingers 🤞
 * */

const wait_function = async (time: number) => new Promise(resolve => setTimeout(() => resolve(`waitted for ${time} seconds`), time * 1000))

// this will start the peer discovery service
entry({
    host: 'localhost',
    port: 4000,
    // create the service discovery service
})
//@ts-ignore
.tester( async ({ logger, waiter, self }: any) => {
    // this will start the service discovery service
    console.log(`[${process.argv[1].split('/').pop()}] testing if everything is running correctly, from the entry point back. Cross your fingers 🤞`)
    // wait for 1
    let result = await waiter.wait(1)
    .then( async (wait_res: string) => {
        let result = await logger.log('waiting for 1 second')
        expect(result).to.be.equal('logged')
        return wait_res
    });
    // check that it returened.
    expect(result).to.be.equal('waitted for 1 seconds')
    // exit the service discovery service
    console.log(`[${process.argv[1].split('/').pop()}] ✅ Entry point is working correctly, congratulations... hurray...`)
    await logger.exit()
    await waiter.exit()
    await self.exit()
})
.logger({
    log: (message: string) => {
        log(message);
        return 'logged';
    },
})
.waiter({ 
    wait: (time: number) => wait_function(time)
})
