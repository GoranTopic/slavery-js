import Service from '../../../src/service'
import { expect } from 'chai'
import { log } from '../../../src/utils'
process.env.debug = 'false';

/* this will test test if the execution of remote abitrary code works correctly on the nodes */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'remote_executioner', host: 'localhost', port: 3003 },
        { name: 'awaiter', host: 'localhost', port: 3004 }
    ], 
    mastercallback: async ({ remote_executioner, awaiter, self}) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing remote master execution`)
        let res = await remote_executioner.exec( ()=>{ return 1 + 1 })
        expect(res).to.be.equal(2)
        // remote code service call
        res = await remote_executioner.exec( async ({ awaiter, self }: any) => {
            self['hidden_value'] = 2;
            return await awaiter.wait(1000);
        })
        expect(res).to.be.equal('waited for 1000ms')
        // get hidden value
        res = await remote_executioner.exec( async ({ self }: any) => {
            return self['hidden_value']
        })
        expect(res).to.be.equal(2)
        // test normal not callable code
        res = await remote_executioner.exec(`
            self['hidden_value'] = 3
            return 1 + 1 
        `)
        expect(res).to.be.equal(2)
        res = await remote_executioner.exec(`
            return self['hidden_value']
        `)
        expect(res).to.be.equal(3)
        res = await remote_executioner.exec(`
                return awaiter.wait(1000)
        `)
        expect(res).to.be.equal('waited for 1000ms')
        console.log(`[${process.argv[1].split('/').pop()}] ✅ test remote node execution done`)
        // exit
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
        number_of_nodes: 1,
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
