slavery-js
=======
#### A simple lib to manage multiple processes on nodejs. It makes horizontal scaling easy on multiple machines over HTTP traffic.

```javascript

slavery()
.master( () => {

            // master code

})
.slave( () => {
 
            // slave code

})
```

## Installation
```
npm install slavery-js
```
## Usage
```javascript
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
        }).slave( async (parameter, slave) => { // create the salve 
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
## Multiple functions
```javascript
import slavery from 'slavery-js';

slavery({
    numberOfSlaves: 3, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
}).master( async master => { // initialize the master
    while( true ) {
        // get idle slave
        let slave = await master.getIdle(); 
        //  check if the salve has done the setup
        let isReady = await slave.is_done('setup');
        // if it has not done the initial setup, run the setup function
        if( !isReady ) 
            slave.run(setup_paramters, 'setup')
        else // if it has done the initial setup, run the default function
            result = slave.run(defualt_parameters)
    }
}).slave( {
    'setup': async (name, slave) => {
        /* let add run the first function with the tag 'setup'
         * this will be the first function to run which will do the initial set up
         * in this case create an instance of the class TestClassic with a given name
         * for the default funtion to the run
         * */
        // create intial setup
        let setup = new Setup();
        // save the setup in the slave
        slave.set('setup', setup);
    }, 
    'default': async (params_for_testClassic, salve) => {
        let setup = salve.get('setup');
        let result = setup.run();
        return result;
    }, 
    'clean up': async (param, slave) => {
        slave.set('setup', null);
        setup.clean();
    }
})
```

## Options
```javascript
import { Server } from "socket.io";

slavery({
    numberOfSlaves: 3, // number of processes to run concurrently, this includes the master process
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
    timeout: 1000, // time to wait for a slave to respond, default is null
    crashOnError: false, // the defaul is to try to keep the slave alive as mush as possible, this will let the process crash on error
    passErrorToMaster: true, // the default is to pass the error to the master, so that the master can handle the error, 
                             // if this is set to false, it is up to the slave to handle the error
    maxTransferSize: 1e9, // the maximum size of data that can be passed between the master and the slave, default is 1e9 = 1GB
    io:  new Server(), // this is the io server socket to be used in the master and slave, if this is not set, it will create a new io client socket
    heartBeat: 1000, // this is the set interval time to check on the slaves, 
    // if this is too high the master process will only be able to checking on the slave an won't have time to run the callback, 
    // if this is too low the master won't have time to check on the slave, 
    // the default is set dynamically based on the number of slaves.
}).master(() => {})
.slave(() => {})
    ```
