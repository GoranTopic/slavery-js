import slavery from '../index.js'
import { performance } from 'perf_hooks'

/* if we have some taks that will take 5 seconds to complete but will only be compeleted once a condition is met. In this case a counter reaching a certain value. then the tasks will take longer to be completed */
// a task which takes s seconds to be completed
let task = () => 
    new Promise( resolve => 
        setTimeout( () =>
            resolve(true), 1000
        )
    )



let master_function = async master => { // initialize the master
    /* this is the functions that will run in the master */
    console.log(`[${process.argv[1].split('/').pop() }] testing if Pool sleep until is working correctly`);

    // start timer
    let start = performance.now();
    let end = null; 
    let timetaken = 0;

    let timer = {
        counter : 0,
        start : setInterval(() =>{ 
            timer.counter++
        }, 1000)
    } 

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
                        //console.log( '[' + slave.id + ']' +
                        //    'starting again when counter is greater than 5',
                        //    'result: ', result
                        //);
                        // sleepUntil is greater than 3
                        slave.sleepUntil( () => timer.counter > 5 )
                        // save result 
                        resolve(result);
                    });
            })
        )
    )
    // end the timer
    end = performance.now();
    let seconds = ((end - start)/1000).toFixed(2);
    if( seconds >= 5 )
        console.log('✅ sleepUntil test passed, took: ', seconds, 'seconds' );
    // it took more than 10 seconds to complete the tasks
    else 
        console.log('❌ sleepUntil test failed, took: ', seconds, 'seconds' );
    master.exit();
}


// create the engine
slavery({
    numberOfSlaves: 3,
    port: 3003, 
    host: 'localhost', 
})
    .master( master_function )
    .slave( async () => { 
        // task which takes one second to be completed
        await task()
        return true;
    })


