import slavery from '../index.js'

// function to count sum of numbers, purely for the porpuse of processing
let make_timeout = s =>
    new Promise( resolve => {
        setTimeout( () => {
            resolve(s)
        }, s * 1000)
    })

let options = {
    numberOfSlaves: 10, 
    port: 3003, 
    host: 'localhost', 
    debug: true,
}


let master_function = async master => { // initialize the master
    // get a slave that is not currely working
    await master.onNewConnection( slave => {
        console.log('new slave: ', slave.id);
        // print status
        master.printStatus();
        // run function
        slave.run(9)
            .then( result => {
                console.log( '[' + slave.id + ']' + ' counter: ',
                    counter, 'result: ', result);
                // save result 
                resolve(result);
            });
    }).catch( err => {
        console.log('error: ', err);
    })
}


let slave_function = async (parameter, slave) => { // create the salve 
    // run some code
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


