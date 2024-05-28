import slavery from '../index.js'

// create the engine
slavery({
    numberOfSlaves: 1,
    port: 3003,
    host: 'localhost', // network host
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] making sure that we can get the correct states from a slave`);
    // get the slave
    let slave = await master.getIdle();
    await slave.run('success');
    await slave.run('error');
}).slave(async param => { // initialize the slave
    if(param === 'success'){
        // set slave to be working for 100ms
        await new Promise( resolve => setTimeout(
            resolve({ msg: 'success' }), 100
        ));
    }else if(param === 'error'){
        throw new Error('this is a error')
    }
}).primary_process( async api => {
    // on success
    api.onSuccess( event => {
        console.log(event);
    });
    // on error
    api.onError( event => {
        console.log(event);
    });
});
