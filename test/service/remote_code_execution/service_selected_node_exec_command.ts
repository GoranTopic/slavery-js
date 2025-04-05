import Service from '../../../src/service'
import { expect } from 'chai'
import { log } from '../../../src/utils'
process.env.debug = 'false';

/* this will test test if the execution of remote abitrary code works correctly on a selected node */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'remote_executioner', host: 'localhost', port: 3003 },
        { name: 'awaiter', host: 'localhost', port: 3004 }
    ], 
    mastercallback: async ({ remote_executioner, awaiter, self}) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing remote master execution`)
        // select a node
        const node = await remote_executioner.select(1)
        let { id, res } = await node.exec( ({ self }: any) => {
            return { id: self.id, res: 1 + 1 }
        })
        const node_id = id;
        expect(res).to.be.equal(2);
        expect(typeof node_id).to.be.equal('string');
        // remote code service call
        ({ id, res } = await node.exec( async ({ awaiter, self }: any) => {
            self['hidden_value'] = 2;
            return { id: self.id, res: 1 + 1 }
        }))
        expect(id).to.be.equal(node_id)
        expect(res).to.be.equal('waited for 1000ms') // get hidden value
        ({ id, res } = await node.exec( async ({ self }: any) => {
            return { id: self.id, res: self['hidden_value'] }
        }))
        expect(id).to.be.equal(node_id)
        expect(res).to.be.equal(2)
        // test normal not callable code
        ({ id, res } = await node.exec(`
            self['hidden_value'] = 3
            return { id: self.id, res: 1 + 1 }
        `))
        expect(id).to.be.equal(node_id)
        expect(res).to.be.equal(2)
        ({ id, res } = await node.exec(`
            return { id: self.id, res: self['hidden_value'] }
        `))
        expect(id).to.be.equal(node_id)
        expect(res).to.be.equal(3)
        // test remote code execution
        ({ id, res } = await node.exec(`
                return { id: self.id, res: awaiter.wait(1000) }
        `))
        expect(id).to.be.equal(node_id)
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
