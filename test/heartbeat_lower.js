import slavery from '../index.js'
/* slavery should atuomatically detect th emost optimal 'heartBeat' for given slaves,
 * */

// function to count sum of numbers, purely for the porpuse of processing
let make_timeout = s =>
    new Promise( resolve => {
        setTimeout( () => {
            resolve(s)
        }, s * 1000)
    })

let options = {
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
    heartBeat: 5000, // heart beat interval in milliseconds
    debug: true, 
}

// start the timer

let master_function = async master => { // initialize the master
    /* this is the functions that will run in the master */
    // random array of big numbers
    // for every number in the array
    let array = Array(1000).fill(1);
    for( let i = 0; i < array.length; i++ ){
        // get a slave that is not currely working
        console.log('master is looking for a slave')
        let slave = await master.getIdle(); 
        //console.log('master got slave', slave)
        slave.run(10)
            .then( result => {
                console.log('master is working on', i)
                //console.log(result)
                console.log(master.status())
            });
    }
};

let slave_function = async (parameter, slave) => { 
    // count sum of numbers
    //console.log('slave is working on', parameter)
    let timeout = make_timeout(parameter);
    let s = await timeout;
    //console.log('slave is done with', parameter)
    return true;
};

// create the engine
slavery(options)
    .master( master_function )
    .slave( slave_function )

