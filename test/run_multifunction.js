import slavery from '../index.js'


let test_classic_names = ['test1', 'test2', 'test3' ];

let params_for_testClassic = [ 'param1', 'param2', 'param3' ];

class TestClassic {
    constructor(name = 'test') {
        this.name = name;
    }
    getName() {
        return this.name;
    }
    test( string ) {
        // if string and this.name have the same number return true
        console.log(`testing ${string} and ${this.name}`);
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
    numberOfSlaves: 3, // number of processes to run concurrently, this includes the master process
    // if this is not set, it will create process relative the the number of cores in the machine
    port: 3003, // port to be used to communicate between salve and master
    host: 'localhost', // network host
})
    .master( async master => { // initialize the master
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
    })
            .slave( {
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
