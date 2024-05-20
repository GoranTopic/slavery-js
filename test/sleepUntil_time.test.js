import slavery from '../index.js'
import { performance } from 'perf_hooks'

console.log(`[${process.argv[1].split('/').pop() }] testing if Pool sleep until is working correctly`);
/* if we have some task that take seconds to be completed by an slave. If Sleep until is working correcly then it will take longer for the task to be completed */

// a task which takes s seconds to be completed
let task = () =>
    new Promise( resolve => 
        setTimeout( () =>
            resolve(true), 1000
        )
    )


let master_function = async master => { // initialize the master
    /* this is the functions that will run in the master */

    // start timer
    let start = performance.now();
    let end = null; 
    let timetaken = 0;

    // we need to complete 10 tasks in more than 10 seconds
    let tasks = Array(10).fill(1)

    // for every number in the array
    await Promise.all( 
        tasks
        .reverse()
        .map( async counter => 
            new Promise( async resolve => {
                // get a slave that is not currely working
                let slave = await master.getIdle(); 
                slave.run(task)
                    .then( result => {
                        console.log( '[' + slave.id + ']' + ' result: ',
                            result, 'sleeping for: 3 seconds' );
                        // sleepUntil for 3 seconds
                        slave.sleepUntil(3 * 1000)
                        // save result 
                        resolve(result);
                    });
            })
        )
    )
    // end the timer
    end = performance.now();
    let seconds = ((end - start)/1000).toFixed(2);
    if( seconds >= 10 )
        console.log('✅ sleepUntil test passed, took: ', seconds, 'seconds' );
    // it took more than 10 seconds to complete the tasks
    else 
        console.log('❌ sleepUntil test failed, took: ', seconds, 'seconds' );
    master.exit();
}


// create the engine
slavery({
    numberOfSlaves: 4, // let play with 3 slaves
    port: 3003, 
    host: 'localhost', 
})
    .master( master_function )
    .slave( async () => { 
        // task which takes one second to be completed
        await task()
        return true;
    })


