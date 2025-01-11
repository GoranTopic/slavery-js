import slavery from 'slaveryr-js';


slavery(options)
    .master( async (master, {logs, slaves}) => {
        // wait until at least one salve is connected
        await logs.info('starting')
        // for every number in the array
        slaves.run(timeout)
            .then( async (result) => // result returned by slave
                await logs.sucess(`result: ${result}`)
            );
    }).slaves( async (slaves, { logs, store }) => {
        slaves.run( async parameter => {
            let result = 'result'
            await store.push({ result })
            await logs.sucess(`done with parameter ${parameter}`);
        })
    }).logs( async logs => {
        logs.info = async message => 
            console.log(`INFO: ${message}`)
        logs.sucess = async message => 
            console.log(`SUCESS: ${message}`)
        logs.error = async message => 
            console.log(`ERROR: ${message}`)
    }).store( async store => {
        store.push = async data => 
            console.log(data)
    })
