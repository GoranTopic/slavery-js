import Service from '../src/Service/index.js'
import { performance } from 'perf_hooks'


let master_callback = async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] testing to check if slavery runs processes concurrently: `);
    let start = performance.now();
    let end = null; 
    await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
        .reverse()
        .map( async counter => 
            new Promise( async resolve => {
                // get a slave that is not currely working
                let slave = await master.getIdle(); 
                slave.run(counter)
                    .then( result => { resolve(result) }
                    );
            })
        )
    )
    // end the timer
    end = performance.now();
    let seconds = ((end - start)/1000).toFixed(2);
    if( seconds > 15 )
        // if it takes more than 15 seconds, then it is not working
        console.log('❌ concurrent test failed, took: ', seconds, 'seconds');
    else 
        console.log('✅ concurrent test passed, took: ', seconds, 'seconds');
    master.exit();
}


let slave_callbacks = {
    'setup': async (params, slave) => {
        // function to count sum of numbers, purely for the porpuse of processing
        let wait_function = s => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
        slave.set('wait_function', wait_function);
        console.log(`slave ${slave.id} was setup`);
        return true;
    }, 
    'run': async (wating_time, slave) => {
        // count sum of numbers
        let make_timeout = slave.get('wait_function');
        let timeout = make_timeout(wating_time);
        let s = await timeout;
        // run some code
        if( s > 7 )
            return { result: `waited for ${s} seconds, 😡` }
        else if( s > 5 )
            return { result: `waited for ${s} seconds, 😐` }
        else if( s > 2  )
            return { result: `waited for ${s} seconds, 😃` }
        else
            return { result: `waited for ${s} seconds, 😄` }
    }, 
    'clean up': async (param, salve) => {
        salve.set('wait_function', null);
    },
    'check clean up': async (param, salve) => {
        let test_classic = salve.get('wait_function');
        return test_classic === null;
    }
}


let new_service = new Service({
    service_name: 'concurrency_service_test',
    servicesAddress: [], // no other service will be ableable
    Mastercallback: master_callback, // the slave callbacks that will be called by the slaves
    SlaveCallbacks: slave_callbacks, // the options that will be passed to the service
    options: {
        host: 'localhost',
        port: 3003,
        numberOfSlaves: 10
    }
});


// shuld not need a function to start, it might
await new_service.start();

