import Service from '../src/service';
import { log } from '../src/utils';
import { performance } from 'perf_hooks';
// add the debug flag to the environment variables to see the debug messages
process.env.debug = 'false';
let master_callback = async ({ nodes }) => {
    console.log(`[${process.argv[1].split('/').pop()}] testing to check if slavery runs processes concurrently: `);
    let start = performance.now();
    let end = null;
    // wait for a least one slave before continuing
    await nodes.numberOfNodes(1);
    await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9]
        .reverse()
        .map(async (counter) => new Promise(async (resolve) => {
        // get a slave that is not currely working
        log(`[test][master][${counter}] waiting for idle slave`);
        let slave = await nodes.getIdle();
        if (slave)
            log(`[test][master][${counter}] got slave:`, slave.id);
        else
            log(`[test][master][${counter}] no slave available`);
        // run the set up on the slave
        await slave.run('setup')
            .then(() => { log(`[test][master] slave ${slave.id} is ready`); });
        // run the wait function
        await slave.run('run', counter)
            .then((result) => { log(`[test][master] slave ${slave.id} returned:`, result); });
        // run clean up
        await slave.run('clean up')
            .then(() => { log(`[test][master] slave ${slave.id} is cleaned up`); });
        resolve(true);
    })));
    // end the timer
    end = performance.now();
    let seconds = parseFloat(((end - start) / 1000).toFixed(2));
    // if it takes more than 15 seconds, then it is not working
    if (seconds > 15)
        console.log('❌ concurrent test failed, took: ', seconds, 'seconds');
    else
        console.log('✅ concurrent test passed, took: ', seconds, 'seconds');
    console.log('[test][master] test ended, service exiting all the nodes');
    nodes.exit();
    // to exit the master process you need to call process.exit(0) fromt his fuction
    // at least that is what I think is happening...
    process.exit(0);
};
let slave_callbacks = {
    'setup': (params, slave) => {
        // function to count sum of numbers, purely for the porpuse of processing
        let wait_function = (s) => new Promise(r => { setTimeout(() => { r(s); }, s * 1000); });
        slave['wait_function'] = wait_function;
        log(`[test][slave][slave ${slave.id}] was setup`);
        return true;
    },
    'run': async (wating_time, slave) => {
        // count sum of numbers
        let make_timeout = slave['wait_function'];
        let timeout = make_timeout(wating_time);
        let s = await timeout;
        // run some code
        if (s > 7)
            return `waited for ${s} seconds, 😡`;
        else if (s > 5)
            return `waited for ${s} seconds, 😐`;
        else if (s > 2)
            return `waited for ${s} seconds, 😃`;
        else
            return `waited for ${s} seconds, 😄`;
    },
    'clean up': async (params, salve) => {
        salve['wait_function'] = undefined;
    },
};
let service = new Service({
    service_name: 'service_test',
    peerServicesAddresses: [], // no other service will be ableable
    mastercallback: master_callback, // the slave callbacks that will be called by the slaves
    slaveMethods: slave_callbacks, // the options that will be passed to the service
    options: {
        host: 'localhost',
        port: 3003,
        number_of_nodes: 9,
    }
});
service.start();
