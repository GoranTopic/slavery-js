
import slavery from '../index.js'

let options = {
    numberOfSlaves: 2, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
}

// start the timer

let master_function = async master => { // initialize the master
    /* this is the functions that will run in the master */
    console.log(`[${process.argv[1]}] testing basic functionality:`);
    let parameter = 'some parameter';
    let slave = await master.getIdle(); 
    slave.run(parameter)
        .then( result => {
            if(result == 'some result')
                console.log('✅ return from slave is successfully');
            else
                console.log('❌ return from slave is not successfully');
            master.exit();
        });
}



let slave_function = async (parameter, slave) => { // create the salve 
    /* 
     * it takes a function which is to be run then master runs: 'slave.run(params)
     * the params passed to slave.run(params) is the first paramter of this function, in this case 'counter'.
     * the second is the slave object. 
     * */
    // count sum of numbers
    if(parameter == 'some parameter')
        console.log('✅ parameter passed to slave is successfully');
    else
        console.log('❌ parameter passed to slave is not successfully');
    let some_result = 'some result';
    return some_result;
};


// create the engine
slavery(options)
    .master( master_function )
    .slave( slave_function )


