import { expect } from "chai";
import Service from '../../src/service'
import { log } from '../../src/utils'
import { performance } from 'perf_hooks'
// add the debug flag to the environment variables to see the debug messages
process.env.debug = 'false';

let master_callback = async ({slaves}: any) => {
    console.log(`[${process.argv[1].split('/').pop()}] testing to check if slavery runs processes concurrently: `);
    let start = performance.now();
    let end = null;
    // wait for a least one slave before continuing
    await slaves.numberOfNodesConnected(1);
    await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ].reverse().map(
        async counter => new Promise( async resolve => {
            // get a slave that is not currely working
            log(`[test][master][${counter}] waiting for idle slave`);
            let slave = await slaves.getIdle();
            if( slave ) log(`[test][master][${counter}] got slave:`, slave.id)
            else console.log(`[test][master][${counter}] no slave available`);
            // run the set up on the slave
            await slave.run('setup')
            .then( (result: any) => {
                expect(result.error).to.be.undefined;
                log(`[test][master] slave ${slave.id} is ready`) })
                // run the wait function
                await slave.run('run', counter)
                .then( (result: any) => {
                    expect(result.error).to.be.undefined;
                    log(`[test][master] slave ${slave.id} returned:`, result)
                })
                // run clean up
                await slave.run('clean up')
                .then( (result: any) => {
                    expect(result.error).to.be.undefined;
                    log(`[test][master] slave ${slave.id} is cleaned up`)
                })
                resolve(true);
        })
    ))
    // end the timer
    end = performance.now();
    let seconds = parseFloat( ((end - start)/1000).toFixed(2) );
    // if it takes more than 15 seconds, then it is not working
    expect(seconds).to.be.lessThan(15);
    console.log(`[${process.argv[1].split('/').pop()}] ✅ test passed, it took ${seconds} seconds`);
    slaves.exit();
    // to exit the master process you need to call process.exit(0) fromt his fuction
    // at least that is what I think is happening...
    process.exit(0);
}

let slave_callbacks = {
    'setup': (params: any, { slave }: any ) => {
        // function to count sum of numbers, purely for the porpuse of processing
        slave['wait_function'] = (s: number) => new Promise( r => setTimeout( () => r(s), s * 1000) );
        return true;
    },
    'run': async (wating_time: number, { slave }: any) => {
        // count sum of numbers
        let make_timeout = slave['wait_function'];
        let timeout = make_timeout(wating_time);
        let s = await timeout;
        // run some code
        if( s > 7 ) return `waited for ${s} seconds, 😡`
        else if( s > 5 ) return `waited for ${s} seconds, 😐`
        else if( s > 2  ) return `waited for ${s} seconds, 😃`
        else return `waited for ${s} seconds, 😄`
    },
    'clean up': async (params: any, { slave }: any) => {
        slave['wait_function'] = undefined
    },
}


let service = new Service({
    service_name: 'service_test',
    // no other service will be available
    peerServicesAddresses: [],
    // the slave callbacks that will be called by the slaves
    mastercallback: master_callback,
    // the options that will be passed to the service
    slaveMethods: slave_callbacks,
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
});
service.start()

