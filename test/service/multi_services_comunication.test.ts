import Service from '../../src/service'
import { expect } from 'chai'
import { log } from '../../src/utils'
process.env.debug = 'false';

/*
 * This test will create 5 services, and will test the comunication between them
 * and the logger service which will log the results of the processing
 */

let counter_even = new Service({
    service_name: 'counter_even',
    peerServicesAddresses: [
        { name: 'counter_odd', host: 'localhost', port: 3002 },
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'logger', host: 'localhost', port: 3004 },
        { name: 'test', host: 'localhost', port: 3005 }
    ],
    slaveMethods: {
        'next': async (input, { self, logger, awaiter }) => {
            await awaiter.wait(1)
            if(self.number === undefined) self.number = 0
            self.number += 2
            let result = self.number
            await logger.log(`counter_even: ${result}`)
            return result
        }
    },
    options: {
        host: 'localhost',
        port: 3001,
    }
})
counter_even.start()

let counter_odd = new Service({
    service_name: 'counter_odd',
    peerServicesAddresses: [
        { name: 'counter_even', host: 'localhost', port: 3001 },
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'logger', host: 'localhost', port: 3004 }
    ],
    slaveMethods: {
        'next': async (input, { logger, counter_even, awaiter }) => {
            await awaiter.wait(1)
            let number = await counter_even.next()
            let result = number += 1
            await logger.log(`counter_odd: ${result}`)
            return result
        }
    },
    options: {
        host: 'localhost',
        port: 3002,
    }
})
counter_odd.start()


let awaiter_service = new Service({
    service_name: 'awaiter',
    peerServicesAddresses: [
        { name: 'counter_even', host: 'localhost', port: 3001 },
        { name: 'counter_odd', host: 'localhost', port: 3002 },
        { name: 'logger', host: 'localhost', port: 3004 },
        { name: 'test', host: 'localhost', port: 3005 }
    ],
    slaveMethods: {
        'wait': async (wating_time: number) => {
            let wait_function =
                (s: number) : Promise<number> => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
            // count sum of numbers
            let s = await wait_function(wating_time)
            return `waited for ${s} seconds, 😄`
        }
    },
    options: {
        host: 'localhost',
        port: 3003,
    }
})
awaiter_service.start()

let logger_service = new Service({
    service_name: 'logger',
    peerServicesAddresses: [
        { name: 'counter_even', host: 'localhost', port: 3001 },
        { name: 'counter_odd', host: 'localhost', port: 3002 },
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'test', host: 'localhost', port: 3005 }
    ],
    slaveMethods: {
        'log': async (message: string) => {
            expect(message).to.be.a('string')
            log('form ' + message);
        }
    },
    options: {
        host: 'localhost',
        port: 3004,
    }
})
logger_service.start()


let test_service = new Service({
    service_name: 'test',
    peerServicesAddresses: [
        { name: 'counter_even', host: 'localhost', port: 3001 },
        { name: 'counter_odd', host: 'localhost', port: 3002 },
        { name: 'awaiter', host: 'localhost', port: 3003 },
        { name: 'logger', host: 'localhost', port: 3004 }
    ],
    mastercallback: async ({ counter_odd, counter_even, awaiter, logger, self }) => {
        console.log(`[${process.argv[1].split('/').pop()}] starting test to see if the services can comunucate with each other`)
            // get odd number
            let even_number = await counter_even.next()
            // get even number
            let odd_number = await counter_odd.next()
            // odd number has to be even number + 1
            expect(odd_number).to.be.equal(even_number*2 + 1)
            await logger.log(`odd_number: ${odd_number}, even_number: ${even_number}`)
            // got to the end
            console.log(`[${process.argv[1].split('/').pop()}] ✅ working multi service comunication]`)
            await counter_even.exit()
            await counter_odd.exit()
            await awaiter.exit()
            await logger.exit()
            await self.exit()
    },
    options: {
        host: 'localhost',
        port: 3005,
    }
})

test_service.start()
