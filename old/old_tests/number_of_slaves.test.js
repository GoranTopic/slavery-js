import slavery from '../index.js'

const test_num = 10;
// create the engine
slavery({
    numberOfSlaves: test_num,
    port: 3003,
}).master( async master => { // initialize the master
    console.log(`[${process.argv[1].split('/').pop()}] testing that the number of slave in options is the correct number of slave created`)
    master.connected(test_num)
        .then(() => { 
            console.log('✅ master has ', master.slaves.size());
            master.exit()
        }).catch(e =>{
            console.error(e)
            throw e
        })
}).slave(() => {})


