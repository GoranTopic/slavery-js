salvery-js
=======
#### A simple lib to make manage multiple processes on nodejs. It its makes so that it can scale on multiple machines

## Installation
```
npm install salvery-js
```
## Usage
```javascript
import slavery from 'slavery.js';

// optinos to pass to the engine    
let options = {
    numberOfSlaves: 3, // number of processes to run concurrently, this includes the master process
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
}

let counter = 0;
let max = 10;

slavery(options)
    .master( async master => { // master function
    /* this is the functions that will run in the master */
        await master.untilConnected();  // wait until at least one salve is connected
        while(max > counter++) { // while loop
            let slave = await master.getIdel(); // get a slave that is not currely working
            slave.run(counter) // run the function defined in .slave( ) with the parameter of counter
                .then( result => { // get the result
                    console.log('done: ', result); 
                }).catch( e => { // print if there was an error
                    console.error('error: ', e);
                });
        }
    })
    .slave( async (parameter, slave) => { // create the salve 
        /* 
        * it takes a function which is to be run then master runs: 'slave.run(params)
        * the params passed to slave.run(params) is the first paramter of this function, in this case 'counter'.
        * the second is the slave object. 
        * */
        // run some code
        if( paramter > 5 )
            return { result: 'counter is greater than 5 =D' }
        else 
            return { result: 'counter is less than 5 =(' }
        if( paramter === 5 )
            throw new Error('counter is 5 =O')
    })

