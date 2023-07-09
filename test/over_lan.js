import slavery from '../index.js'
import { performance } from 'perf_hooks'


let options = {
    numberOfSlaves: 12, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: '192.168.50.239', // network host
}

// start the timer
let master_function = async master => { 
    /* this is the functions that will run in the master */
    let slave = await master.getIdle(); 
    slave.run('some param')
        .then( result => {
            if(result === 'some result') 
                console.log('✅ slave returned the correct result');
            else 
                console.log('❌ slave returned the wrong result');
        });
}


let slave_function = async (parameter, slave) => { 
    // this is the functions that will run in the slave
    if(parameter === 'some param') return 'some result';
    return 'error';
};


// create the engine
slavery(options)
    .master( master_function )
    .slave( slave_function )


