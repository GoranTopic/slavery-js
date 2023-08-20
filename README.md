slavery-js
=======
#### A simple lib to make manage multiple processes on nodejs. It makes horizontal scaling easy on multiple machines.

## Installation
```
npm install slavery-js
```
## Usage
```javascript
import slavery from 'slavery.js';

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
    numberOfSlaves: 9, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create a process relative to the number of cores in the machine
    port: 3003, // port to be used to communicate between slave and master
    host: 'localhost', // network host
}

//Create the engine
    slavery(options)
        .master( async master => { // initialize the master
            /* This is the functions that will run in the master */
            // wait until at least one salve is connected
            await master.untilConnected();  
            // random array of big numbers
            // for every number in the array
            for (let timeout of timeouts ){
                // Get a slave that is not currently working
                let slave = await master.getIdle(); 
                slave.run(timeout)
                    .then( result => // result returned by slave
                        console.log( result )
                    );
            }
        })
.slave( async (parameter, slave) => { // create the salve 
            /* 
             * it takes a function which is to be run then master runs: 'slave.run(params)
             * the params passed to slave.run(params) is the first parameter of this function, in this case, 'counter'.
             * The second is the slave object. 
             * */
            let timeout = make_timeout(parameter);
            let s = await timeout;
            // run some code
            if( s > 7 )
                return { result: `waited for ${s} seconds, 😡` }
            else if( s > 5 )
                return { result: `waited for ${s} seconds, 😐` }
            else if( s > 2  )
                return { result: `waited for ${s} seconds, 😃` }
            else
                return { result: `waited for ${s} seconds, 😄` }
        })
});
```
