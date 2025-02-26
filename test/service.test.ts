import Service from '../src/service'
import { performance } from 'perf_hooks'


let master_callback = async ({nodes}: any) => {
    console.log(`[${process.argv[1].split('/').pop()}] testing to check if slavery runs processes concurrently: `);
    let start = performance.now();
    let end = null; 
    // wait for a least one slave before continuing
    await nodes.numberOfNodes(1);
    await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
        .reverse()
        .map( 
             async counter => new Promise( async resolve => {
                // get a slave that is not currely working
                let slave = await nodes.getIdle(); 
                if( slave ) console.log('[test][master] got slave:', slave.id)
                else console.log('[test][master] no slave available');
                // print the listners from the slave
                console.log('[test][master] slave listeners:', slave.getListeners());
                await slave.run('setup')
                    .then( () => { console.log(`[test][master] slave ${slave.id} is ready`) })
                    .catch( (error: any) => { console.log(`[test][master] slave ${slave.id} failed to setup`, error) });
                await slave.run('run', counter)
                    .then( (result: any) => { console.log('[test][master] result from slave:', result) })
                    .catch( (error: any) => { console.log('[test][master] slave failed to run', error) });
            })
        )
    )
    // end the timer
    end = performance.now();
    let seconds = parseFloat( ((end - start)/1000).toFixed(2) );
    if( seconds > 15 )
        // if it takes more than 15 seconds, then it is not working
        console.log('❌ concurrent test failed, took: ', seconds, 'seconds');
    else 
        console.log('✅ concurrent test passed, took: ', seconds, 'seconds');
    nodes.exit();
}


let slave_callbacks = {
    'setup': async (params: any , slave: any) => {
        // function to count sum of numbers, purely for the porpuse of processing
        let wait_function = 
            (s: number) => new Promise( r => { setTimeout( () => { r(s) }, s * 1000) })
        slave.set('wait_function', wait_function);
        console.log(`[test][slave][slave ${slave.id}] was setup`);
        return true;
    }, 
    'run': async (wating_time: number, slave: any) => {
        console.log(`[test][slave][slave ${slave.id}] running with ${wating_time} seconds`);
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
    'clean up': async (params: any, salve: any) => {
        salve.set('wait_function', null);
    },
    'check clean up': async (params: any, salve: any) => {
        let test_classic = salve.get('wait_function');
        return test_classic === null;
    }
}


let new_service = new Service({
    service_name: 'service_test',
    peerServicesAddresses: [], // no other service will be ableable
    mastercallback: master_callback, // the slave callbacks that will be called by the slaves
    slaveMethods: slave_callbacks, // the options that will be passed to the service
    options: {
        host: 'localhost',
        port: 3003,
        number_of_processes: 1,
    }
});


// shuld not need a function to start, it might

new_service.start().then( () => {
    console.log('service done');
}).catch( (error: any) => {
    console.log('service failed to start', error);
});


