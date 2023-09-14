import slavery from '../index.js'


let test_classic_names = ['test1', 'test2', 'test3' ];

let params_for_testClassic = [ 'param1', 'param2', 'param3' ];

class TestClassic {
    constructor(name = 'test') {
        this.name = 'test';
    }
    getName() {
        return this.name;
    }
    test( string ) {
        // if string and this.name have the same number return true
        let numberFromName = this.name.match(/\d+/g);
        let numberFromString = string.match(/\d+/g);
        if(numberFromName && numberFromString) {
            return numberFromName[0] === numberFromString[0];
        }
        return false;
    }
}


// create the engine
slavery({
    numberOfSlaves: 5, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
})
    .master( async master => { // initialize the master
        console.log(`[${process.argv[1]}] testing initial setup`);
        for(let i = 0; i < test_classic_names.length; i++) {
            let slave = await master.getIdle(); 
            let promise = slave.run(test_classic_names[i], 'setup')
            promise.then( result => console.log(
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
        }
    })
    .slave( {
        'setup': async (test_classic_names, salve) => {
            /* let add run the first function with the tag 'setup'
             * this will be the first function to run which will do the initial set up
             * in this case create an instance of the class TestClassic with a given name
             * for the default funtion to the run
             * */
            // create intial setup
            let test_classic = new TestClassic(test_classic_names);
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
        }
    })

/*
 * console.log('✅ parameter passed to slave is successfully');
 *           console.log('❌ parameter passed to slave is not successfully'); 
*/

