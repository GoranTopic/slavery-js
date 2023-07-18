import slavery from '../index.js'

let options = {
    numberOfSlaves: 10,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code checks that the slave run s cycle, on the salve queue */
slavery(options)
    .master( async master => { // initialize the master
        // rotate
        await master.connected(10);
        // got all slaves
        console.log('got all slaves');
        // wait 5 seconds
        console.log('waiting 5 seconds...');
        await new Promise( resolve => setTimeout(resolve, 5000));
        master.exit();
        console.log('✅ master exited successfully');
    })

