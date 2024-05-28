import slavery from '../index.js'

// function to count sum of numbers, purely for the porpuse of processing
let make_timeout = s =>
    new Promise( resolve => {
        setTimeout( () => {
            resolve(s)
        }, s * 1000)
    })

let options = {
    //numberOfSlaves: 40, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
    heartBeat: 10, // heart beat interval in milliseconds
    debug: false,
}

// start the timer

let master_function = async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] testing to check if heart beat is raised when the idle rate is low enough`);
    let heartBeats = [];
    let promises = [];
    /* this is the functions that will run in the master */
    // random array of big numbers
    // for every number in the array
    let array = Array(30).fill(1);
    for( let i = 0; i < array.length; i++ ){
        // get a slave that is not currely working
        let slave = await master.getIdle(); 
        promises.push(
            slave.run(10)
            .then( result => {
                let { heartBeat, idleRate } = master.status();
                //console.log( 'heartBeat', heartBeat, 'idleRate', idleRate);
            })
        );
    }
    // wait for all promises to be resolved
    await Promise.all(promises);
// split the heart beats by half
    let heartBeats1 = heartBeats.slice(0, heartBeats.length/2)
        .map( v => parseFloat(v) );
    // check if all values are in decending order
    let isAscending = 
        heartBeats1.every( (v,i,a) => !i || a[i-1] <= v );
    if( isAscending )
        console.log('✅ heart beats are in ascending');
    else
        console.log('❌ heart beats are not in ascending');
    master.exit();
};


let slave_function = async (parameter, slave) => { 
    // create the slave 
    /* 
     * it takes a function which is to be run then master runs: 'slave.run(params)
     * the params passed to slave.run(params) is the first paramter of this function, in this case 'counter'.
     * the second is the slave object. 
     * */
    // count sum of numbers
    let timeout = make_timeout(parameter);
    let s = await timeout;
    return true;
};

// create the engine
slavery(options)
    .master( master_function )
    .slave( slave_function )

