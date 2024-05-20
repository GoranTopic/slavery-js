import slavery from '../index.js'
// get keyboad input 
import readline from 'readline';

// create the engine
slavery({
    numberOfSlaves: 3,
    port: 3003,
    host: 'localhost', // network host
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] testing if the primery process is working correctly`);
    let slave = await master.getIdle(); 
    let count = 100;
    slave.run(count)
        .then( result => 
            console.log('slave returned: ', result)
        );
}).slave( async s => {
    return await new Promise( resolve => 
        setTimeout(() => resolve(s), s * 1000000)
    )
}).primary_process( async api => {
    //console.log('primary running in the primary process:');
    let res = await api.pingMaster();
    if (res) {
        console.log('✅ pinged master from primary process');
        await api.exit();
    }else 
        throw new Error('ping master failed');
});


