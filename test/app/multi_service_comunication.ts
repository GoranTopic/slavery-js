import slavery from '../../src/index'
import { expect } from 'chai'
import { log } from '../../src/utils'
process.env.debug = 'false';

let wait_function = async s => await new Promise(r => setTimeout(() => r(s), s * 1000))

/*
 * This test will create 5 services, and will test the comunication between them
 * and the logger service which will log the results of the processing
 */

slavery({
    host: 'localhost',
    port: 3000,
})
//@ts-ignore
.counter_even({
    '_startup': async (input, { logger }) => {
        await logger.log('counter_even service started')
    },
    'next': async (input, { self, logger, awaiter }) => {
        await awaiter.wait(1)
        if(self.number === undefined) self.number = 0
            self.number += 2
        let result = self.number
        await logger.log(`counter_even: ${result}`)
        return result
    }
})

.counter_odd({
    '_startup': async (input, { logger }) => {
        await logger.log('counter_odd service started')
    },
    'next': async (input, { logger, counter_even, awaiter }) => {
        await awaiter.wait(1)
        let number = await counter_even.next()
        let result = number += 1
        await logger.log(`counter_odd: ${result}`)
        return result
    }
})

.awaiter({
    'wait': async (wating_time: number) => {
        console.log(`waiting for ${wating_time} seconds`)
        // count sum of numbers
        let s = await wait_function(wating_time)
        return `waited for ${s} seconds, 😄`
    }
})

.logger({
    'log': async (message: string) => {
        expect(message).to.be.a('string')
        log('form ' + message);
    }
})

.test( 
      async ({ counter_odd, counter_even, awaiter, logger, self }) => {
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
      })

