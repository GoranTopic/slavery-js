import Service from '../../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

// this test will check if gettgin a value withno key passed works correctly
// such as set({ some: 'data' }) and get() should return { some: 'data' }
// if working correcly


let tester_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [
        { name: 'stasher', host: 'localhost', port: 3002 }
    ],
    mastercallback: async ({ stasher, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing if we can set and get data from the stash to the nodes`)
        // testing if we can set data
        let data = await stasher.getStash()
        //console.log('[test] stashed data:', data)
        expect(data).to.deep.equal({ some_data: ['some', 'list', 'of', 'data'] })
        // try to set data to the stash
        await stasher.setStash({ some_data: ['some', 'list', 'of', 'data', 'updated'] })
        data = await stasher.getStash()
        expect(data).to.deep.equal({ some_data: ['some', 'list', 'of', 'data', 'updated'] })
        console.log(`[${process.argv[1].split('/').pop()}] ✅ stash was gotten and set correctly`)
        await stasher.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3001,
    }
})
tester_service.start()

let stasher_service = new Service({
    service_name: 'stasher',
    peerServicesAddresses: [ 
        { name: 'tester', host: 'localhost', port: 3001 } 
    ], 
    mastercallback: async ({ self }) => {
        // testing if we can set data
        await self.set({ some_data: ['some', 'list', 'of', 'data']})
    },
    slaveMethods: {
        'getStash': async (params, { self }) => {
            return await self.get()
        },
        'setStash': async (params, { self }) => {
            await self.set(params)
            return true
        }
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
stasher_service.start()


