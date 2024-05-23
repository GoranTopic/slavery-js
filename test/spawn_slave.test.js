import slavery from '../index.js'

let numberOfSlaves = 3;
// create the engine
slavery({
    numberOfSlaves,
    port: 3003,
    host: 'localhost', // network host
}).master( async () => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] test is we are able to spawn a slave`);
}).slave( 
    () => {} 
).primary_process( async api => {
    // wait until all the slaves are connected
    await api.slavesConnected(numberOfSlaves);
    // get the number of slaves
    let preSlaveNum = (await api.getSlaves()).length;
    // if workers are one less than the slaves, pss the test
    api.spawnSlave();
    await api.slavesConnected(numberOfSlaves + 1);
    let postSlaveNum = (await api.getSlaves()).length;
    if (postSlaveNum - preSlaveNum === 1) {
        console.log('✅ slave spawned successfully');
    } else {
        console.log('❌ slave not spawned successfully');
    }

    // exit the process
    await api.exit();
});
