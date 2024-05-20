
import slavery from '../index.js'
// get the lan ip

let options = {
    numberOfSlaves: 12, 
    host: '127.0.0.1',
    port: 3003, 
}

// start the timer
let master_function = async master => { 
    /* this is the functions that will run in the master */
    console.log(`[${process.argv[1].split('/').pop()}] testing if we can connect with slaves over lan`);
    let slave = await master.getIdle(); 
    slave.run('some param')
        .then( result => {
            if(result === 'some result') 
                console.log('✅ slave returned the correct result');
            else 
                console.log('❌ slave returned the wrong result');
            master.exit()
        });
}


// create the engine
slavery(options)
    .master( master_function )
.slave( async (param) => {
    if(param === 'some param') return 'some result';
    else return 'wrong result';
})


