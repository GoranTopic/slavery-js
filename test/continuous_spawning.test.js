import slavery from '../index.js'

let numberOfSlaves = 3;
let cycles = 100;
// create the engine
slavery({
    numberOfSlaves,
    port: 3003,
    host: 'localhost', // network host
}).master( async () => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] test how long are we able to spawn workers and kill workers continuously: testing ${cycles} for brevity`);
}).slave( 
    () => {} 
).primary_process( async api => {
    // define the worker and slave, and last worker
    let workers, slaves, lastWorker = {id: 0};
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
