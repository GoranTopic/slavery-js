import slavery from '../index.js'


let options = {
    numberOfSlaves: 12, 
    host: '192.168.50.239',
    port: 3003, 
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


// create the engine
slavery(options)
    .master( master_function )


