import slavery from '../index.js'

// create the engine
slavery({
    numberOfSlaves: 1,
    port: 3003,
    host: 'localhost', // network host
}).master( async () => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] making sure that we can get the correct states from a slave`);
}).slave(async () => {
    // wait for a long time
    await new Promise(resolve => setTimeout(resolve, 10000));
}).primary_process( async api => {
    // get the slave 
    slave 
    console.log( await api.getSlave() );
    // cycle through the workers
    while(lastWorker.id < cycles) {
        //kill a worker
        await api.killWorker();
        // spawn a worker
        await api.spawnSlave();
        // await until the slaves are connected
        await api.slavesConnected(numberOfSlaves);
        // get the workers and slaves, and last worker
        workers = await api.getWorkers()
        slaves = await api.getSlaves()
        lastWorker = workers[workers.length - 1];
        // log the workers, slaves and last worker
        //console.log('workers:', workers)
        //console.log('slaves:', slaves)
        //console.log('lastWorker:', lastWorker.id)
    }
    if(slaves.length === numberOfSlaves ) {
        console.log('✅ continuous spawning test passed');
    } else {
        console.log('❌ continuous spawning test failed');
    }
    // exit the process
    await api.exit();
});
