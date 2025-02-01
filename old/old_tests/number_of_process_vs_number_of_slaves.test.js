import slavery from '../index.js'

// get keyboad input 
let numSlaves = 100;

// create the engine
slavery({
    numberOfSlaves: numSlaves,
    port: 3003,
    host: 'localhost', // network host
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] test the creation of slave vs the number of workers`);
}).slave( 
    () => {} 
).primary_process( async api => {
    // wait until all the slaves are connected
    await api.slavesConnected(numSlaves);
    // get the number of workers
    let workers = await api.getWorkers();
    // get the number of slaves
    let slaves = await api.getSlaves()
    // if workers are one less than the slaves, pass the test
    if (workers.length - 1 === slaves.length) {
        console.log('✅ correct number of slave, with workers:', workers.length, 'and slaves:', slaves.length);
    } else {
        console.log('❌ incorrect number of slave, with workers:', workers.length, 'and slaves:', slaves.length);
    }
    // exit the process
    await api.exit();
});
