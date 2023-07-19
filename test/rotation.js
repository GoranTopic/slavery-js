import slavery from '../index.js'

// function to count sum of numbers, purely for the porpuse of processing
let count = c => {
    let sum = 0;
    for(let i = 0; i < c; i++){
        sum += i;
    }
    return sum;
}

let make_setTimeout = ms => {
    return new Promise( (resolve, reject) => {
        setTimeout( () => {
            resolve();
        }, ms)
    })
}

let numberOfSlaves = 15;

let options = {
    numberOfSlaves,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code checks that the slave run s cycle, on the salve queue */
slavery(options)
    .master( async master => { // initialize the master
        console.log(`[${process.argv[1]}] testing the slaves are being rotated correcly`);
        let rotation = false;
        let num_of_slaves = numberOfSlaves - 1;
        let first_slave = await master.getIdle();
        let rotation_counter = 0;
        let ms = 1000;
        // run counter
        first_slave.run({ms})
        // rotate
        while(rotation == false){
            // get a slave that is not currely working
            //console.log('getting idle slave');
            let slave = await master.getIdle(); 
            rotation_counter++;
            if(rotation_counter == num_of_slaves){
                if(slave.id == first_slave.id)
                    console.log('✅ rotation passed');
                else 
                    console.log('❌ rotation failed');
                // exit process
                master.exit();
            }
            // run counter
            slave.run({ms})
                .then(result => {});
        }
    })
    .slave( async parameter => { 
        // run counter code
        let { ms } = parameter;
        // set timeout
        await make_setTimeout(ms);
        // return the result
        return true;
    })

