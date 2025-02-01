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
    await slave.run();
}).slave(async () => { // initialize the slave
    // set slave to be working for 100ms
        await new Promise( resolve => setTimeout(resolve, 100) );
}).primary_process( async api => {
    await api.slavesConnected(1);
    // get the slave 
    let state = (await api.getSlaves())[0].status;
    if (state === 'busy') {
        console.log('✅ slave status is busy');
    } else {
        console.log('❌ slave status is not busy');
    }
    await api.sleep(1000);
    state = (await api.getSlaves())[0].status;
    if (state === 'idle') {
        console.log('✅ slave status is idle');
    } else {
        console.log('❌ slave status is not idle');
    }
    await api.exit();
});
