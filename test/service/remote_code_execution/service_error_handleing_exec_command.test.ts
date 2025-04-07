import Service from '../../../src/service'
import { expect } from 'chai'
process.env.debug = 'false';

/* this will test how we handle errors in the code executed in the remote node */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'remote_executioner', host: 'localhost', port: 3003 },
        { name: 'awaiter', host: 'localhost', port: 3004 }
    ], 
    mastercallback: async ({ remote_executioner, awaiter, self}) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing testing error handling in remote code execution`)
        // select a node
        try {
            await remote_executioner.exec( 
               ({ self }: any) => {
               self.notDefinedValue.err = 1
                return { id: self.id, value: self.notDefinedValue + 1 }
            })
        } catch (e: any) {
            expect(e.message).to.be.equal('Cannot set properties of undefined (setting \'err\')')
        }
        try {
            await remote_executioner.exec(
                ` self['definedValue'] = 1
                lsjdnlksjndlksnl
                awaiter.wait(1000) `
            )
        } catch (e: any) {
            expect(e.message).to.be.equal('lsjdnlksjndlksnl is not defined')
        }
        try {
            await remote_executioner.exec_master( async ({ self }: any) => {
                self['definedValue'] = 1
                self.notDefinedValue.err = 1
                awaiter.wait(1000)
                return { id: self.id, value: self.definedValue + 1 }
            })
        } catch (e: any) {
            expect(e.message).to.be.equal('Cannot set properties of undefined (setting \'err\')')
        }
        try {
            await remote_executioner.exec_master(
                ` self['definedValue'] = 1
                lsjdnlksjndlksnl
                awaiter.wait(1000) `
            )
        } catch (e: any) {
            expect(e.message).to.be.equal('lsjdnlksjndlksnl is not defined')
        }
        console.log(`[${process.argv[1].split('/').pop()}] ✅ handled errors in remote code execution`)
        await remote_executioner.exit()
        await awaiter.exit()
        await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
main_service.start()

let exec_service = new Service({
    service_name: 'remote_executioner',
    peerServicesAddresses: [
        { name: 'tester', host: 'localhost', port: 3002 },
        { name: 'awaiter', host: 'localhost', port: 3004 }
    ],
    mastercallback: async ({}) => { },
    slaveMethods: {
        'some_method': async (a: number, b: number) => {
            return a + b
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
})
exec_service.start()

let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [],
    slaveMethods: {
        wait: async (ms: number) => {
           await new Promise((resolve) => setTimeout(() => resolve(true), ms) )
           return 'waited for ' + ms + 'ms'
        }
        
    },
        options: {
        host: 'localhost',
        port: 3004,
    }
})
awaiter_service.start()
