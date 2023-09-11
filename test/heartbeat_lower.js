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
    debug: false, 
}

// start the timer
let master_function = async master => { // initialize the master
    console.log(`[${process.argv[1]}]
testing to check if heart beat is lowered when the idle rate of slave is too high`)
    let heartBeats = [];
    let promises = [];
    /* this is the functions that will run in the master */
    // random array of big numbers
    // for every number in the array
    let array = Array(30).fill(1);
    for( let i = 0; i < array.length; i++ ){
        // get a slave that is not currely working
        let slave = await master.getIdle(); 
        //console.log('master got slave', slave)
        promises.push(
            slave.run(10)
            .then( result => {
                let { heartBeat, idleRate } = master.status();
                console.log(
                    'heartBeat:', heartBeat,
                    'idleRate:', idleRate
                );
                heartBeats.push(heartBeat);
            })
        )
    }
    // wait for all promises to be resolved
    await Promise.all(promises);
    // split the heart beats by half
    let heartBeats1 = heartBeats.slice(0, heartBeats.length/2);
    // check if all values are in decending order or each value is greater than the previous value
    let isDecending = 
        heartBeats1.every( (v,i,a) => !i || a[i-1] >= v );
    if(isDecending)
        console.log('✅ heart beats are in decending order')
    else
        console.log('❌ heart beats are not in decending order')
    master.exit();
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

