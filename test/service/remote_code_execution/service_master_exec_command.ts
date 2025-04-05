import Service from '../../../src/service'
import { expect } from 'chai'
import { log } from '../../../src/utils'
process.env.debug = 'false';

/* this will test test if the execution of remote abitrary code works correctly on the master node */


let main_service = new Service({
    service_name: 'tester',
    peerServicesAddresses: [ 
        { name: 'remote_executioner', host: 'localhost', port: 3003 },
    ], 
    mastercallback: async ({ remote_executioner, self}) => {
        console.log(`[${process.argv[1].split('/').pop()}] testing remove master execution`)
        let res = await remote_executioner.exec_master( ()=>{
            console.log('executing remote code')
            return 1 + 1
        })
        console.log('res:', res)
        //expect(res).to.be.equal(2)
        //console.log(`[${process.argv[1].split('/').pop()}] ✅ 
        // exit
        //await remote_executioner.exit()
        //await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
main_service.start()


let exec_service = new Service({
    service_name: 'remote_executioner',
    peerServicesAddresses: [ { name: 'tester', host: 'localhost', port: 3002 } ],
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
