import slavery from '../index.js'

let options = {
    numberOfSlaves: 11,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code checks that the slave run s cycle, on the salve queue */
slavery(options)
    .master( async master => { // initialize the master
        console.log(`[${process.argv[1].split('/').pop()}] testing to check if slavery runs processes concurrently: `);
        // rotate
        await master.connected(10);
        // got all slaves
        console.log('got all slaves');
        // wait 5 seconds
        console.log('waiting 5 seconds...');
        await new Promise( resolve => setTimeout(resolve, 5000));
        console.log('✅ if you dont see this message anything else after this message, it is becuase it exited successfully')
        master.exit();
        console.log('❌ if you see this message, it is becuase it exited successfully')
    }) 
    .slave( () => { })
