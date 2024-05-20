import slavery from '../index.js'

let options = {
    numberOfSlaves: 6,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

let master_function = async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] testing how we get the status of the master`) 
    // get a slave that is not currely working
    let slave = await master.getIdle();
    console.log('new slave: ', slave.id);
    // print status
    let status = master.status();
    console.log('status: ', status);
    master.exit()
}

// create the engine
slavery(options)
    .master( master_function )
    .slave()
