import Service from '../../../src/service'
import { expect } from 'chai'
import { log } from '../../../src/utils'
process.env.debug = 'false';

/* this will test test if the execution of remote abitrary code works correctly on the master node */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'remote_executioner', host: 'localhost', port: 3003 },
        { name: 'awaiter', host: 'localhost', port: 3004 }
    ], 
    mastercallback: async ({ remote_executioner, awaiter, self}) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing remote master execution`)
        let res = await remote_executioner.exec_master( ()=>{ return 1 + 1 })
        expect(res).to.be.equal(2)
        // remote code service call
        res = await remote_executioner.exec_master( async ({ awaiter }: any) => {
            return await awaiter.wait(1000)
        })
        expect(res).to.be.equal('waited for 1000ms')
        // get hidden value
        res = await remote_executioner.exec_master( async ({ self }: any) => {
            return self['hidden_value']
        })
        expect(res).to.be.equal(2)
        // test normal not callable code
        res = await remote_executioner.exec_master(`
            self['hidden_value'] = 3
            return 1 + 1 
        `)
        expect(res).to.be.equal(2)
        res = await remote_executioner.exec_master(`
            return self['hidden_value']
        `)
        expect(res).to.be.equal(3)
        res = await remote_executioner.exec_master(`
                return awaiter.wait(1000)
        `)
        expect(res).to.be.equal('waited for 1000ms')
        console.log(`[${process.argv[1].split('/').pop()}] ✅ test remote master execution done`)
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
    mastercallback: async ({ self }) => {
        // lets hide some value int he self
        let hidden_value = 2
        self['hidden_value'] = hidden_value
    },
    options: {
        host: 'localhost',
        port: 3003,
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
