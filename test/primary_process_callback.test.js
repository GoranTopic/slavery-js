import slavery from '../index.js'

// create the engine
slavery({
    numberOfSlaves: 1,
    port: 3003,
    host: 'localhost', // network host
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] making sure that we can get the correct states from a slave`);
    // get the slave
    let slave = await master.getIdle();
    await slave.run('success');
    try{
        await slave.run('error');
    }catch(e){
        // do nothing
    }
    await slave.run('too big return');
}).slave(async param => { // initialize the slave
    if(param === 'success'){
        // set slave to be working for 100ms
        return { res: 'success' }
    }else if(param === 'error'){
        throw new Error('this is a error');
    }else if(param === 'too big return'){
        return new Array(200000).fill(0).map( (v, i) => i);
    }
}).primary_process( async api => {
    // on success
    await Promise.all([
        new Promise( (resolve, reject) => {
            let normalSuccess = false;
            let truncatedSuccess = false;
            api.onSuccess( event => {
                if(event.result.res === 'success'){
                    console.log('✅ got success callback from master');
                    normalSuccess = true;
                }else if(event.result === 'Result truncated due to size'){
                    console.log('✅ got success callback from master with truncated result', event.size, 'bytes, limit is 1MB');
                    truncatedSuccess = true;
                }else{
                    console.log('❌ did not get success callback from master');
                    reject();
                }
                if(normalSuccess && truncatedSuccess)
                    resolve();
            });
        }),
        new Promise( (resolve, reject) => {
            api.onError( event => {
                if(event.error.message === 'this is a error'){
                    console.log('✅ got error callback from master');
                    resolve();
                }else{
                    console.log('❌ did not get error callback from master');
                    reject();
                }
            });
        }),
    ])
    api.exit();
});
