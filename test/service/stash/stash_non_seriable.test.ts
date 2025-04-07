import Service from '../../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

// this test will check what happends when you try to stash a non serializable object
// let find out!


let tester_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [
        { name: 'stasher', host: 'localhost', port: 3002 }
    ],
    mastercallback: async ({ stasher, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing if we can set and get data from the stash to the nodes`)
            // let set a value that is serializable first
            await stasher.setStash({ key: 'key1', value: ['some', 'serializable', 'data', '=)'] })
            // try to get the data from the stash
            let data = await stasher.getStash('key1')
            expect(data).to.deep.equal(['some', 'serializable', 'data', '=)'])
            // let set a value that is not serializable
            let non_serializable_data = { 
                function_data: () => { console.log('this is a function') },
                date_data: new Date('2025-03-28T21:31:22.107Z'),                
                regexp_data: new RegExp('ab+c', 'i'),
                undefined_data: undefined,
                instance_data: new Error('this is an error'),
                string_data: 'this is a string',
            }
            await stasher.setStash({ key: 'key2', value: non_serializable_data })
            data = await stasher.getStash('key2')
            expect(data).to.deep.equal({
                date_data: '2025-03-28T21:31:22.107Z',
                regexp_data: {},
                instance_data: {},
                string_data: 'this is a string'
            })
        console.log(`[${process.argv[1].split('/').pop()}] ✅ stash ignored non serializable data`)
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
    slaveMethods: {
        'getStash': async (key, {self}) => {
            return await self.get(key)
        },
        'setStash': async ({key, value}, {self}) => {
            return await self.set(key, value)
        }
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
stasher_service.start()


