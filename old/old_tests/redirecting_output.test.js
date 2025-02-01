import slavery from '../index.js'

// create the engine
slavery({
    numberOfSlaves: 1,
    port: 3003,
    host: 'localhost', // network host
    output: './redirecting_output.log',
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] redirecting output to a files`);
    // get the slave
    let slave = await master.getIdle();
    console.log(`[${process.argv[1].split('/').pop()}] writting output of the slave to a file`);
    await slave.run();
    master.exit();
}).slave(async () => { // initialize the slave
    await new Promise(resolve => {
        let interval = setInterval(() =>  // with date 
            console.log(`[${new Date().toISOString()}][${process.argv[1].split('/').pop()}] running...`), 100
        );
        // stop the slave after 3 seconds
        setTimeout(() => {
            clearInterval(interval)
            resolve();
        }, 3000);
    });
});
