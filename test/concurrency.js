import slavery from '../index.js'
import { performance } from 'perf_hooks'

// function to count sum of numbers, purely for the porpuse of processing
let make_timeout = s =>
    new Promise( resolve => {
        setTimeout( () => {
            resolve(s)
        }, s * 1000)
    })

let options = {
    numberOfSlaves: 10, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
}


// start the timer

let master_function = async master => { // initialize the master
    /* this is the functions that will run in the master */
    // random array of big numbers
    // for every number in the array
    let start = performance.now();
    let end = null; 
    let timetaken = 0;
    await Promise.all( [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
        .reverse()
        .map( async counter => 
            new Promise( async resolve => {
                // get a slave that is not currely working
                let slave = await master.getIdle(); 
                slave.run(counter)
                    .then( result => {
                        console.log( '[' + slave.id + ']' + ' counter: ',
                            counter, 'result: ', result);
                        // save result 
                        resolve(result);
                    });
            })
        )
    )
    // end the timer
    end = performance.now();
    let  seconds = ((end - start)/1000).toFixed(2);
    if( seconds > 15 )
        // if it takes more than 15 seconds, then it is not working
        console.log('❌ concurrent test failed, took: ', seconds, 'seconds' );
    else 
        console.log('✅ concurrent test passed, took: ', seconds, 'seconds' );
    master.exit();
}


let slave_function = async (parameter, slave) => { // create the salve 
    /* 
     * it takes a function which is to be run then master runs: 'slave.run(params)
     * the params passed to slave.run(params) is the first paramter of this function, 
     * in this case 'counter'. 
     * the second is the slave object. 
     * */
    // count sum of numbers
    let timeout = make_timeout(parameter);
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
};


// create the engine
slavery(options)
    .master( master_function )
    .slave( slave_function )


