import slavery from '../index.js'
import process from 'node:process';

let options = {
    numberOfSlaves: 1,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code will test if the master node can upadte and hanldle when a slave disconects */

slavery(
    options
).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] test if the callbacks for the slave are working`);
    master.onSuccess( data => {
        console.log('✅ success callback', data);
    });
    master.onError( data => {
        console.log('✅ error callback', data);
    });
    // catching errors from slaves
    await master.connected(1);
    // got all slaves
    let slave = await master.getIdle();
    await slave.run('success') 
    try{
        await slave.run('error');
    }catch(e){
        //console.error(e);
    }
    master.exit();
}).slave( async (params, slave) => {
    if(params == 'success'){
        return 'success';
    }else if(params == 'error'){
        throw new Error('error');
    }
})



