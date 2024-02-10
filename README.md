slavery-js
=======
#### A simple lib to manage multiple processes on nodejs. It makes horizontal scaling easy on multiple machines over HTTP traffic.

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
## Usage
```javascript
import slavery from 'slavery.js';

let test_classic_names = ['test1', 'test2', 'test3' ];

let params_for_testClassic = [ 'param1', 'param2', 'param3' ];


// create the engine
slavery({
    numberOfSlaves: 3, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
}).master( async master => { // initialize the master
        console.log(`[${process.argv[1]}] testing the ability to pass multiple functions to slaves and run the sequntialy`);
        await Promise.all( test_classic_names.map( async (name, i) => {
            let slave = await master.getIdle(); 
            return slave.run(name, 'setup')
                .then( result => console.log(
                result ?
                `✅ slave ${slave.id} was setup` : 
                `❌ slave ${slave.id} was not setup successfully`
            ))
                .then( async () => await slave.run(params_for_testClassic[i]))
                .then( result => console.log(
                    result ?
                    `✅ slave ${slave.id} did ran successfully` :
                    `❌ slave ${slave.id} did not run successfully`
                ))
                .then( async () => await slave.run(null ,'clean up'))
                .then( async () => await slave.run(null ,'check clean up'))
                .then( result => console.log(
                    result ?
                    `✅ slave ${slave.id} was cleaned up successfully` :
                    `❌ slave ${slave.id} was not cleaned up successfully`
                ))
        }))
        // exit the master
        master.exit();
    }).slave( {
                'setup': async (name, salve) => {
                    /* let add run the first function with the tag 'setup'
                     * this will be the first function to run which will do the initial set up
                     * in this case create an instance of the class TestClassic with a given name
                     * for the default funtion to the run
                     * */
                    // create intial setup
                    let test_classic = new TestClassic(name);
                    // salve it in the slave
                    salve.set('test_classic', test_classic);
                    console.log(`slave ${salve.id} was setup`);
                    return true;
                }, 
                'default': async (params_for_testClassic, salve) => {
                    let test_classic = salve.get('test_classic');
                    let result = test_classic.test(params_for_testClassic);
                    console.log(`setup ran success: ${result}`);
                    return result;
                }, 
                'clean up': async (param, salve) => {
                    salve.set('test_classic', null);
                },
                'check clean up': async (param, salve) => {
                    let test_classic = salve.get('test_classic');
                    return test_classic === null;
                }
            })
```
