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
    console.log(`[${process.argv[1].split('/').pop()}] test if the client will timeout when the slave times out`);
    // rotate
    await master.connected(10);
    console.log('got all slaves');
    // got all slaves
    let { connections: connectionsBefore } = master.status();
    console.log('connections before disconect', connectionsBefore);
    await Promise.all( Array(10).fill(0).map( async () => {
        let slave = await master.getIdle();
        // wait 5 seconds
        slave.run()
    }
    ));
    // wait 5 seconds
    await new Promise( resolve => setTimeout(resolve, 5000));
    let { connections: connectionsAfter } = master.status();
    console.log('connections after disconnections', connectionsAfter);
    if(connectionsBefore > connectionsAfter)
        console.log('✅ some slaves disconected');
    else
        console.log('❌ no slaves disconected, run again just in case');
    master.exit();
}).slave( async (params, slave) => {
    let isOdd = process.pid % 2 === 0 ? true : false;
    // if it us odd disconnect
    if(isOdd) slave.socket.disconnect();
    return process.pid;
})



