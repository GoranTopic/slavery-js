import slavery from '../index.js'
import process from 'node:process';

let options = {
    numberOfSlaves: 11,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code will test if the master node can upadte and hanldle when a slave disconects */

slavery(
    options
).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] test if framework can hanlde errors gracefully`);
    // rotate
    await master.connected(10);
    console.log('got all slaves');
    // got all slaves
    await Promise.all( Array(10).fill(0).map( async () => {
        let slave = await master.getIdle();
        // wait 5 seconds
        slave.run()
    }
    ));
    // wait 5 seconds
    //await new Promise( resolve => setTimeout(resolve, 5000));
    //console.log('✅ some slaves disconected');
    //console.log('❌ no slaves disconected, run again just in case');
    master.exit();
})
/*
    .slave( async (params, slave) => {
    let result = slave.thisFunctionDoesNotExist();
    return result;
})
*/



