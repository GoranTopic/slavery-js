import slavery from 'slaveryr-js';

//Make different timeouts
let make_timeout = s =>
    new Promise( resolve => {
        setTimeout( () => {
            resolve(s)
        }, s * 1000)
    })

let timeouts = [ 1, 2, 3, 4, 5, 6, 7, 8 ].reverse()

// options to pass to the engine    
let options = {
    master: {
        processes: 1, // number of processes to run concurrently, this includes the master process
        host: 'localhost', // network host
        port: 3004, // port to be used to communicate between slave and master
    },
    slaves: {
        processes: 4, // number of processes to run concurrently
    },
    logs: {
        processes: 1, // number of processes to run concurrently
    },
    
    // this will be the same for the primary process
    port: 3003, // port to be used to communicate between slave and master
    host: 'localhost', // network host
}

slavery(options)
    .master( async (master, {logs, slaves}) => {
        // wait until at least one salve is connected
        await logs.info('starting')
        // for every number in the array
        for (let timeout of timeouts ){
            // Get a slave that is not currently working
            slaves.run(timeout)
                .then( async (result) => // result returned by slave
                    await logs.sucess(`result: ${result}`)
                );
        }
    }).slaves( async (slaves, { logs, store }) => {
        slaves.run( async parameter => {
            await logs.info(`running with parameter ${parameter}`);
            let timeout = make_timeout(parameter);
            await logs.info(`waiting for ${parameter} seconds`);
            let s = await timeout;
            let result;
            if( s > 7 )
                result = `waited for ${s} seconds, 😢`
            else if( s > 5 )
                result = `waited for ${s} seconds, 😞`
            else if( s > 2  )
                result = `waited for ${s} seconds, 😐`
            else {
                result = `waited for ${s} seconds, 😄`
                await logs.error(`waited for ${s} seconds, 😄`)
            }

            await store.push({ result })
            await logs.sucess(`done with parameter ${parameter}`);
        })
    }).logs( async logs => {
        logs.info = async message => {
            console.log(`INFO: ${message}`)
        }
        logs.sucess = async message => {
            console.log(`SUCESS: ${message}`)
        }
        logs.error = async message => {
            console.log(`ERROR: ${message}`)
        }
    }).store( async store => {
        store.push = async data => {
            console.log(data)
        }
    })
