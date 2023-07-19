console.log(`[${process.argv[2]}] testing if we can connect with master over lan`);

import slavery from '../index.js'


let options = {
    numberOfSlaves: 12,
    host: '192.168.50.239',
    port: 3003, 
}

let slave_function = async (parameter, slave) => { 
    // this is the functions that will run in the slave
    if(parameter === 'some param') return 'some result';
    return 'error';
};

// create the engine
slavery(options)
    .slave( slave_function )


