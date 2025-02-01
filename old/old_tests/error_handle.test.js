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
    console.log(`[${process.argv[1].split('/').pop()}] test if framework can hanlde errors gracefully`);
    let errorsCaught = 0;
    // catching errors from slaves
    await master.connected(1);
    // got all slaves
    let slave = await master.getIdle();
    try{
        await slave.run('code error');
    }catch(e){
        errorsCaught++;
    }
    try{
        await slave.run('thrown error');
    }catch(e){
        errorsCaught++;
    }
    // check if errors were caught
    if(errorsCaught == 2) console.log('✅ errors were caught');
    else console.log('❌ errors were not caught');
    master.exit();
}).slave( async (params, slave) => {
    if(params === 'code error') return slave.thisFunctionDoesNotExist();
    else if(params == 'thrown error') throw new Error('this is a thrown error');
})



