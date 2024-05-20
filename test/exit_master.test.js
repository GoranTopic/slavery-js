import slavery from '../index.js'

let options = {
    numberOfSlaves: 10,
    port: 3003, 
    host: 'localhost', 
    debug: false,
}

/* this code checks that the slave run s cycle, on the salve queue */
slavery(options)
    .master( async master => { // initialize the master
        // rotate
        // wait 5 seconds
        console.log('⏳ this test should not stall');
        master.exit();
    })
