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
    // kill worker
    await api.killWorker();
    // exit the process
    await api.exit();
});
